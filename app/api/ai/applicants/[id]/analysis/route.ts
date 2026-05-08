import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { recordAuditLog } from "@/lib/audit-log";
import { dbConnect } from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import { applicantAiAnalysisSchema } from "@/lib/ai-types";
import { createStructuredOpenAIResponse, hasOpenAIConfig } from "@/lib/openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// 20 analyses per user per minute; 10 per IP per minute
const AI_ANALYSIS_LIMIT = { limit: 20, windowMs: 60_000, label: "ai-analysis" };
const AI_ANALYSIS_IP_LIMIT = {
  limit: 10,
  windowMs: 60_000,
  label: "ai-analysis-ip",
};

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function normalizeAnalysisArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeAiText(item))
    .filter(Boolean)
    .slice(0, 5);
}

function sanitizeAiText(value: unknown, maxLength = 320) {
  const normalized = String(value ?? "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  const repeatedGlyphPattern = /(.{1,3})\1{8,}/;
  if (repeatedGlyphPattern.test(normalized)) {
    return "";
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
    : normalized;
}

function describeAiReviewFailure(error: unknown) {
  const rawMessage =
    error instanceof Error ? error.message : "Unable to generate AI analysis.";

  if (rawMessage.includes("followUpQuestions")) {
    return {
      logMessage:
        "AI review failed because the model returned too many follow-up questions for the required schema.",
      clientMessage:
        "AI review returned too many follow-up items. Please try again.",
    };
  }

  if (
    rawMessage.includes("fetch failed") ||
    rawMessage.includes("Unable to reach OpenAI")
  ) {
    return {
      logMessage:
        "AI review failed because the app could not reach OpenAI. This is usually a network, timeout, or upstream availability issue.",
      clientMessage:
        "AI review could not reach OpenAI right now. Please try again in a moment.",
    };
  }

  if (rawMessage.includes("OpenAI request failed")) {
    return {
      logMessage: `AI review failed because OpenAI rejected the request. Details: ${sanitizeAiText(rawMessage, 500)}`,
      clientMessage:
        "AI review request was rejected by OpenAI. Please try again.",
    };
  }

  return {
    logMessage:
      sanitizeAiText(rawMessage, 500) || "Unable to generate AI analysis.",
    clientMessage:
      sanitizeAiText(rawMessage, 220) || "Unable to generate AI analysis.",
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  // Rate limit: IP bucket first, then per-user bucket
  const ipCheck = checkRateLimit(request, AI_ANALYSIS_IP_LIMIT);
  if (!ipCheck.allowed) return rateLimitResponse(ipCheck);

  const userCheck = checkRateLimit(request, AI_ANALYSIS_LIMIT, session.user.id);
  if (!userCheck.allowed) return rateLimitResponse(userCheck);

  if (!hasOpenAIConfig()) {
    return NextResponse.json(
      { message: "OpenAI API key is not configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  await dbConnect();

  const applicant = await Applicant.findOne({
    _id: new Types.ObjectId(id),
    organizationId: new Types.ObjectId(session.user.organizationId),
  }).lean();

  if (!applicant) {
    return NextResponse.json(
      { message: "Applicant not found." },
      { status: 404 },
    );
  }

  try {
    const analysis = await createStructuredOpenAIResponse({
      schemaName: "applicant_analysis",
      schemaDescription: "A leasing-focused review of a tenant application.",
      schema: {
        type: "object",
        additionalProperties: false,
        required: [
          "summary",
          "recommendation",
          "confidence",
          "strengths",
          "concerns",
          "followUpQuestions",
        ],
        properties: {
          summary: { type: "string" },
          recommendation: {
            type: "string",
            enum: ["Approve", "Review", "Decline"],
          },
          confidence: { type: "string", enum: ["Low", "Medium", "High"] },
          strengths: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 5,
          },
          concerns: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 5,
          },
          followUpQuestions: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 5,
          },
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are an assistant for landlords reviewing tenant applications. Provide practical leasing guidance, not legal advice. Be concise, grounded in the supplied data, and do not invent facts.",
        },
        {
          role: "user",
          content: JSON.stringify({
            applicant: {
              id: String(applicant._id),
              name: applicant.name,
              coApplicants: applicant.coApplicants ?? [],
              monthlyRent: applicant.monthlyRent,
              monthlyIncome: applicant.monthlyIncome,
              housingSupport: applicant.housingSupport ?? "None",
              supportProgram: applicant.supportProgram ?? "",
              monthlySubsidyAmount: applicant.monthlySubsidyAmount ?? 0,
              tenantPortionRent: applicant.tenantPortionRent ?? 0,
              subsidyStatus: applicant.subsidyStatus ?? "N/A",
              inspectionStatus: applicant.inspectionStatus ?? "N/A",
              responsibleRent:
                applicant.responsibleRent ?? applicant.monthlyRent,
              affordabilityRatio: applicant.affordabilityRatio,
              residentScore:
                applicant.residentScore ?? applicant.scores?.resident ?? 0,
              totalScore: applicant.totalScore,
              decision: applicant.decision,
              status: applicant.status,
              redFlags: applicant.redFlags,
              scores: applicant.scores,
              notes: applicant.notes,
            },
            instructions:
              "Summarize whether this application looks strong, borderline, or risky for a landlord. If multiple adults are on the same application, evaluate the household together and mention any co-applicant strength or gap that matters. Treat the resident score as a screening score from the application source when provided. If housing assistance or a voucher exists, evaluate affordability using the tenant-paid share or responsible rent rather than penalizing voucher status itself. Highlight practical strengths, concerns, and useful follow-up questions.",
          }),
        },
      ],
    });

    const analysisRecord = analysis as Record<string, unknown>;
    const normalizedAnalysis = {
      ...analysisRecord,
      summary: sanitizeAiText(analysisRecord.summary, 500),
      recommendation: sanitizeAiText(analysisRecord.recommendation, 20),
      confidence: sanitizeAiText(analysisRecord.confidence, 20),
      strengths: normalizeAnalysisArray(analysisRecord.strengths),
      concerns: normalizeAnalysisArray(analysisRecord.concerns),
      followUpQuestions: normalizeAnalysisArray(
        analysisRecord.followUpQuestions,
      ),
    };

    const parsedAnalysis = applicantAiAnalysisSchema.parse(normalizedAnalysis);
    await recordAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "ai.review_generated",
      entityType: "applicant",
      entityId: String(applicant._id),
      message: `Generated AI review for ${applicant.name}.`,
    });
    return NextResponse.json(parsedAnalysis);
  } catch (error) {
    const failure = describeAiReviewFailure(error);
    await recordAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "ai.review_failed",
      entityType: "applicant",
      entityId: String(applicant._id),
      level: "error",
      message: failure.logMessage,
      metadata: {
        rawError:
          error instanceof Error
            ? sanitizeAiText(error.message, 800)
            : "Unknown error",
      },
    });
    return NextResponse.json(
      {
        message: failure.clientMessage,
      },
      { status: 500 },
    );
  }
}
