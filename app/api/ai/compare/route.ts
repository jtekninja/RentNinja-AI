import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import { applicantComparisonSchema } from "@/lib/ai-types";
import { createStructuredOpenAIResponse, hasOpenAIConfig } from "@/lib/openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// 10 comparisons per user per minute; 5 per IP per minute
const AI_COMPARE_LIMIT = { limit: 10, windowMs: 60_000, label: "ai-compare" };
const AI_COMPARE_IP_LIMIT = {
  limit: 5,
  windowMs: 60_000,
  label: "ai-compare-ip",
};

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  // Rate limit: IP bucket first, then per-user bucket
  const ipCheck = checkRateLimit(request, AI_COMPARE_IP_LIMIT);
  if (!ipCheck.allowed) return rateLimitResponse(ipCheck);

  const userCheck = checkRateLimit(request, AI_COMPARE_LIMIT, session.user.id);
  if (!userCheck.allowed) return rateLimitResponse(userCheck);

  if (!hasOpenAIConfig()) {
    return NextResponse.json(
      { message: "OpenAI API key is not configured." },
      { status: 503 },
    );
  }

  await dbConnect();

  const applicants = await Applicant.find({
    organizationId: new Types.ObjectId(session.user.organizationId),
  })
    .sort({ totalScore: -1, createdAt: -1 })
    .limit(5)
    .lean();

  if (applicants.length < 2) {
    return NextResponse.json(
      { message: "Add at least two applicants to compare." },
      { status: 400 },
    );
  }

  try {
    const comparison = await createStructuredOpenAIResponse({
      schemaName: "applicant_comparison",
      schemaDescription:
        "A ranked comparison of tenant applicants for a landlord.",
      schema: {
        type: "object",
        additionalProperties: false,
        required: [
          "bestApplicantId",
          "ranking",
          "overview",
          "watchouts",
          "nextStep",
        ],
        properties: {
          bestApplicantId: { type: "string" },
          overview: { type: "string" },
          watchouts: { type: "array", items: { type: "string" } },
          nextStep: { type: "string" },
          ranking: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["applicantId", "rank", "reason"],
              properties: {
                applicantId: { type: "string" },
                rank: { type: "integer" },
                reason: { type: "string" },
              },
            },
          },
        },
      },
      input: [
        {
          role: "system",
          content:
            "You are an assistant helping a landlord compare applicants. Rank candidates based only on the supplied data. Be practical and concise. Do not invent extra facts.",
        },
        {
          role: "user",
          content: JSON.stringify({
            applicants: applicants.map((applicant) => ({
              applicantId: String(applicant._id),
              name: applicant.name,
              coApplicants: applicant.coApplicants ?? [],
              totalScore: applicant.totalScore,
              decision: applicant.decision,
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
              redFlags: applicant.redFlags,
              scores: applicant.scores,
              status: applicant.status,
            })),
            instructions:
              "Choose the best current applicant, rank the group from strongest to weakest, explain why, and mention any watchouts a landlord should review. If a record has coApplicants, treat it as one household application and use the combined income and household context. Treat the resident score as a screening score from the application source when provided. If an applicant has a voucher or subsidy, consider the tenant-paid share and workflow readiness instead of treating assistance itself as risk.",
          }),
        },
      ],
    });

    return NextResponse.json(applicantComparisonSchema.parse(comparison));
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to compare applicants.",
      },
      { status: 500 },
    );
  }
}
