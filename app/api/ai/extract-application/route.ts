import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createStructuredOpenAIResponse,
  hasOpenAIConfig,
  uploadOpenAIFile,
} from "@/lib/openai";
import { extractedApplicantSchema } from "@/lib/ai-types";
import { dbConnect } from "@/lib/mongodb";
import Organization from "@/models/Organization";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  badRequest,
  unauthorized,
  unavailable,
  internalError,
} from "@/lib/api-error";

// 10 extractions per user per minute; 5 per IP per minute
const AI_EXTRACT_LIMIT = { limit: 10, windowMs: 60_000, label: "ai-extract" };
const AI_EXTRACT_IP_LIMIT = {
  limit: 5,
  windowMs: 60_000,
  label: "ai-extract-ip",
};

const sourceDetectors = [
  { value: "Apartments.com", pattern: /apartments\.com|smartmove|transunion/i },
  { value: "Zillow", pattern: /\bzillow\b/i },
  { value: "TurboTenant", pattern: /\bturbotenant\b/i },
  { value: "RentSpree", pattern: /\brentspree\b/i },
  { value: "Avail", pattern: /\bavail\b/i },
  { value: "Other", pattern: /\bweimark\b/i },
] as const;

function normalizeExtractedString(
  value: string | null | undefined,
  fallback = "",
) {
  return typeof value === "string" ? value.trim() : fallback;
}

function inferApplicationSource(applicationSource: string, text: string) {
  const normalizedSource = normalizeExtractedString(applicationSource);
  if (normalizedSource && normalizedSource !== "Email / Manual") {
    return normalizedSource;
  }
  const detected = sourceDetectors.find((source) => source.pattern.test(text));
  return detected?.value ?? (normalizedSource || "Email / Manual");
}

function inferEmail(value: string, text: string) {
  const normalizedValue = normalizeExtractedString(value).toLowerCase();
  if (normalizedValue) return normalizedValue;
  const match = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  return match ? match[0].toLowerCase() : "";
}

function inferPhone(value: string, text: string) {
  const normalizedValue = normalizeExtractedString(value);
  if (normalizedValue) return normalizedValue;
  const match = text.match(
    /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/,
  );
  return match ? match[0].trim() : "";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized(request);

  // Rate limit: IP bucket first, then per-user bucket
  const ipCheck = checkRateLimit(request, AI_EXTRACT_IP_LIMIT);
  if (!ipCheck.allowed) return rateLimitResponse(ipCheck);
  const userCheck = checkRateLimit(request, AI_EXTRACT_LIMIT, session.user.id);
  if (!userCheck.allowed) return rateLimitResponse(userCheck);

  if (!hasOpenAIConfig()) {
    return unavailable(request, "OpenAI API key is not configured.");
  }

  try {
    await dbConnect();
  } catch {
    return internalError(request, new Error("Database connection failed"), {
      logContext: { action: "ai-extract.connect" },
    });
  }

  let organization;
  try {
    organization = await Organization.findById(
      session.user.organizationId,
    ).lean();
  } catch (error) {
    return internalError(request, error, {
      logContext: { action: "ai-extract.findOrg" },
    });
  }

  const complianceSettings = {
    defaultPropertyCity:
      organization?.complianceSettings?.defaultPropertyCity || "",
    defaultPropertyState:
      organization?.complianceSettings?.defaultPropertyState || "",
    useClearBackgroundChecksAsPositiveSignal:
      organization?.complianceSettings
        ?.useClearBackgroundChecksAsPositiveSignal ?? true,
    allowCriminalHistoryScoreImpact:
      organization?.complianceSettings?.allowCriminalHistoryScoreImpact ??
      false,
    allowRegistryScoreImpact:
      organization?.complianceSettings?.allowRegistryScoreImpact ?? false,
    allowOfacScoreImpact:
      organization?.complianceSettings?.allowOfacScoreImpact ?? false,
    requireManualReviewForConsumerReportFindings:
      organization?.complianceSettings
        ?.requireManualReviewForConsumerReportFindings ?? true,
  };

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest(request, "Invalid form data");
  }

  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const sourceText = String(formData.get("sourceText") || "").trim();

  const hasFile = files.length > 0;
  const hasSourceText = sourceText.length > 0;

  if (!hasFile && !hasSourceText) {
    return badRequest(request, "Upload a file or paste application text.");
  }

  const supportedMimeTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ];
  if (files.some((file) => !supportedMimeTypes.includes(file.type))) {
    return badRequest(request, "Supported formats: PDF, PNG, JPG, WEBP.");
  }

  try {
    const contentParts: Array<Record<string, unknown>> = [];

    for (const file of files) {
      if (file.type === "application/pdf") {
        const fileId = await uploadOpenAIFile(file);
        contentParts.push({ type: "input_file", file_id: fileId });
      } else {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        contentParts.push({
          type: "input_image",
          image_url: `data:${file.type};base64,${base64}`,
          detail: "high",
        });
      }
    }

    if (hasSourceText) {
      contentParts.push({
        type: "input_text",
        text: `Pasted application text:\n${sourceText}`,
      });
    }

    const extracted = await createStructuredOpenAIResponse({
      schemaName: "extracted_applicant",
      schemaDescription:
        "Structured applicant data extracted from a rental application file.",
      schema: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "email",
          "phone",
          "propertyAddress",
          "propertyPostalCode",
          "moveInDate",
          "coApplicants",
          "monthlyRent",
          "monthlyIncome",
          "housingSupport",
          "supportProgram",
          "monthlySubsidyAmount",
          "tenantPortionRent",
          "subsidyStatus",
          "inspectionStatus",
          "residentScore",
          "rentalHistoryScore",
          "rulesComplianceScore",
          "timelineScore",
          "communicationScore",
          "documentationScore",
          "applicationSource",
          "status",
          "notes",
          "missingItems",
          "extractionSummary",
        ],
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          propertyAddress: { type: "string" },
          propertyPostalCode: { type: "string" },
          moveInDate: { type: "string" },
          coApplicants: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "name",
                "email",
                "phone",
                "monthlyIncome",
                "residentScore",
                "notes",
              ],
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                monthlyIncome: { type: "number" },
                residentScore: { type: "number" },
                notes: { type: "string" },
              },
            },
          },
          monthlyRent: { type: "number" },
          monthlyIncome: { type: "number" },
          housingSupport: {
            type: "string",
            enum: ["None", "Voucher", "Subsidy"],
          },
          supportProgram: { type: "string" },
          monthlySubsidyAmount: { type: "number" },
          tenantPortionRent: { type: "number" },
          subsidyStatus: {
            type: "string",
            enum: ["N/A", "Pending", "Verified"],
          },
          inspectionStatus: {
            type: "string",
            enum: ["N/A", "Pending", "Passed", "Failed"],
          },
          residentScore: { type: "number" },
          rentalHistoryScore: { type: "number" },
          rulesComplianceScore: { type: "number" },
          timelineScore: { type: "number" },
          communicationScore: { type: "number" },
          documentationScore: { type: "number" },
          applicationSource: {
            type: "string",
            enum: [
              "Apartments.com",
              "Zillow",
              "TurboTenant",
              "RentSpree",
              "Avail",
              "Email / Manual",
              "Other",
            ],
          },
          status: {
            type: "string",
            enum: ["New", "Screening", "Approved", "Review", "Rejected"],
          },
          notes: { type: "array", items: { type: "string" } },
          missingItems: { type: "array", items: { type: "string" } },
          extractionSummary: { type: "string" },
        },
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `Extract applicant details from this rental application, regardless of source. Read the full packet, not just one page... Workspace compliance settings: default property city="${complianceSettings.defaultPropertyCity}", default property state="${complianceSettings.defaultPropertyState}"...`,
            },
          ],
        },
        {
          role: "user",
          content: [
            ...contentParts,
            {
              type: "input_text",
              text: "Return applicant data for a tenant-screening dashboard...",
            },
          ],
        },
      ],
    });

    const parsed = extractedApplicantSchema.parse(extracted);
    const extractedText = [
      parsed.extractionSummary,
      ...parsed.notes,
      ...parsed.missingItems,
    ]
      .filter(Boolean)
      .join("\n");

    return NextResponse.json({
      ...parsed,
      name: normalizeExtractedString(parsed.name),
      email: inferEmail(parsed.email, extractedText),
      phone: inferPhone(parsed.phone, extractedText),
      propertyAddress: normalizeExtractedString(parsed.propertyAddress),
      propertyPostalCode: normalizeExtractedString(parsed.propertyPostalCode),
      moveInDate: normalizeExtractedString(parsed.moveInDate),
      coApplicants: parsed.coApplicants
        .map((coApplicant) => ({
          name: normalizeExtractedString(coApplicant.name),
          email: inferEmail(
            coApplicant.email,
            `${coApplicant.notes}\n${extractedText}`,
          ),
          phone: inferPhone(
            coApplicant.phone,
            `${coApplicant.notes}\n${extractedText}`,
          ),
          monthlyIncome: coApplicant.monthlyIncome,
          residentScore: coApplicant.residentScore,
          notes: normalizeExtractedString(coApplicant.notes),
        }))
        .filter((coApplicant) => coApplicant.name),
      applicationSource: inferApplicationSource(
        parsed.applicationSource,
        extractedText,
      ),
      supportProgram: normalizeExtractedString(parsed.supportProgram),
      notes: parsed.notes.filter(Boolean),
      missingItems: parsed.missingItems.filter(Boolean),
    });
  } catch (error) {
    return internalError(request, error, {
      logContext: { action: "ai-extract.openai" },
    });
  }
}
