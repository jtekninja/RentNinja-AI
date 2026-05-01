import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStructuredOpenAIResponse, hasOpenAIConfig, uploadOpenAIFile } from "@/lib/openai";
import { extractedApplicantSchema } from "@/lib/ai-types";
import { dbConnect } from "@/lib/mongodb";
import Organization from "@/models/Organization";

const sourceDetectors = [
  { value: "Apartments.com", pattern: /apartments\.com|smartmove|transunion/i },
  { value: "Zillow", pattern: /\bzillow\b/i },
  { value: "TurboTenant", pattern: /\bturbotenant\b/i },
  { value: "RentSpree", pattern: /\brentspree\b/i },
  { value: "Avail", pattern: /\bavail\b/i },
  { value: "Other", pattern: /\bweimark\b/i }
] as const;

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function normalizeExtractedString(value: string | null | undefined, fallback = "") {
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
  if (normalizedValue) {
    return normalizedValue;
  }

  const match = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  return match ? match[0].toLowerCase() : "";
}

function inferPhone(value: string, text: string) {
  const normalizedValue = normalizeExtractedString(value);
  if (normalizedValue) {
    return normalizedValue;
  }

  const match = text.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/);
  return match ? match[0].trim() : "";
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  if (!hasOpenAIConfig()) {
    return NextResponse.json({ message: "OpenAI API key is not configured." }, { status: 503 });
  }

  await dbConnect();

  const organization = await Organization.findById(session.user.organizationId).lean();
  const complianceSettings = {
    defaultPropertyCity: organization?.complianceSettings?.defaultPropertyCity || "",
    defaultPropertyState: organization?.complianceSettings?.defaultPropertyState || "",
    useClearBackgroundChecksAsPositiveSignal: organization?.complianceSettings?.useClearBackgroundChecksAsPositiveSignal ?? true,
    allowCriminalHistoryScoreImpact: organization?.complianceSettings?.allowCriminalHistoryScoreImpact ?? false,
    allowRegistryScoreImpact: organization?.complianceSettings?.allowRegistryScoreImpact ?? false,
    allowOfacScoreImpact: organization?.complianceSettings?.allowOfacScoreImpact ?? false,
    requireManualReviewForConsumerReportFindings: organization?.complianceSettings?.requireManualReviewForConsumerReportFindings ?? true
  };

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  const sourceText = String(formData.get("sourceText") || "").trim();

  const hasFile = files.length > 0;
  const hasSourceText = sourceText.length > 0;

  if (!hasFile && !hasSourceText) {
    return NextResponse.json({ message: "Upload a file or paste application text." }, { status: 400 });
  }

  const supportedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
  if (files.some((file) => !supportedMimeTypes.includes(file.type))) {
    return NextResponse.json({ message: "Supported formats: PDF, PNG, JPG, WEBP." }, { status: 400 });
  }

  try {
    const contentParts: Array<Record<string, unknown>> = [];

    for (const file of files) {
      if (file.type === "application/pdf") {
        const fileId = await uploadOpenAIFile(file);
        contentParts.push({
          type: "input_file",
          file_id: fileId
        });
      } else {
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");

        contentParts.push({
          type: "input_image",
          image_url: `data:${file.type};base64,${base64}`,
          detail: "high"
        });
      }
    }

    if (hasSourceText) {
      contentParts.push({
        type: "input_text",
        text: `Pasted application text:\n${sourceText}`
      });
    }

    const extracted = await createStructuredOpenAIResponse({
      schemaName: "extracted_applicant",
      schemaDescription: "Structured applicant data extracted from a rental application file.",
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
          "extractionSummary"
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
              required: ["name", "email", "phone", "monthlyIncome", "residentScore", "notes"],
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                phone: { type: "string" },
                monthlyIncome: { type: "number" },
                residentScore: { type: "number" },
                notes: { type: "string" }
              }
            }
          },
          monthlyRent: { type: "number" },
          monthlyIncome: { type: "number" },
          housingSupport: { type: "string", enum: ["None", "Voucher", "Subsidy"] },
          supportProgram: { type: "string" },
          monthlySubsidyAmount: { type: "number" },
          tenantPortionRent: { type: "number" },
          subsidyStatus: { type: "string", enum: ["N/A", "Pending", "Verified"] },
          inspectionStatus: { type: "string", enum: ["N/A", "Pending", "Passed", "Failed"] },
          residentScore: { type: "number" },
          rentalHistoryScore: { type: "number" },
          rulesComplianceScore: { type: "number" },
          timelineScore: { type: "number" },
          communicationScore: { type: "number" },
          documentationScore: { type: "number" },
          applicationSource: {
            type: "string",
            enum: ["Apartments.com", "Zillow", "TurboTenant", "RentSpree", "Avail", "Email / Manual", "Other"]
          },
          status: { type: "string", enum: ["New", "Screening", "Approved", "Review", "Rejected"] },
          notes: { type: "array", items: { type: "string" } },
          missingItems: { type: "array", items: { type: "string" } },
          extractionSummary: { type: "string" }
        }
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `Extract applicant details from this rental application, regardless of source. Read the full packet, not just one page. If the packet includes two adults applying together, treat it as one household application: keep the main applicant in name/email/phone, list the second adult and any others inside coApplicants, and set monthlyIncome to the combined verified household monthly income from all applicants. Use each coApplicant.monthlyIncome for that person's own verified monthly income. If the packet provides a separate source screening score or ResidentScore for a co-applicant, store it in coApplicant.residentScore using the source scale shown. Capture the rental property's street address in propertyAddress when it is shown. Capture moveInDate when the desired or scheduled move-in date is shown. If a field is not clearly present, return a safe fallback instead of inventing. If the file shows a housing voucher, subsidy, tenant-paid portion, housing assistance paperwork, or inspection status, map that into housingSupport, supportProgram, monthlySubsidyAmount, tenantPortionRent, subsidyStatus, and inspectionStatus. Use 'Voucher' for housing choice voucher style programs, 'Subsidy' for other rent assistance, and 'None' when no assistance appears. If the application includes a ResidentScore or similar source-provided screening score, place it in residentScore using the source scale shown in the document. For TransUnion SmartMove or Apartments.com ResidentScore, keep the raw 350-850 value. If no source-provided screening score exists, leave residentScore at 0 instead of inventing one. However, always score rentalHistoryScore, rulesComplianceScore, timelineScore, communicationScore, and documentationScore from 0-100 using the whole packet. Use the evidence across pay stubs, W-2s, bank statements, screening reports, application pages, and any missing or inconsistent documents. Documentation should reflect how complete and verifiable the packet is. Timeline should reflect move-in readiness and consistency across recent documents. Communication should reflect responsiveness/clarity only when there is evidence; otherwise give a neutral mid-range score rather than 0. Rental history should use prior address, landlord data, screening history, and stability clues when present. Rules compliance must respect fair-housing and tenant-screening limits and should not use housing voucher status or any protected characteristic. MissingItems should only list items that are absent from both the uploaded packet and the extracted structured fields. Do not mark property address, monthly rent, postal code, or move-in date as missing if you extracted them into structured output. Workspace compliance settings: default property city="${complianceSettings.defaultPropertyCity}", default property state="${complianceSettings.defaultPropertyState}", use clear background checks as positive signal=${String(complianceSettings.useClearBackgroundChecksAsPositiveSignal)}, allow criminal history score impact=${String(complianceSettings.allowCriminalHistoryScoreImpact)}, allow registry score impact=${String(complianceSettings.allowRegistryScoreImpact)}, allow OFAC score impact=${String(complianceSettings.allowOfacScoreImpact)}, require manual review for consumer-report findings=${String(complianceSettings.requireManualReviewForConsumerReportFindings)}. Apply those settings when using criminal, registry, or OFAC information. If a setting is false, do not use that signal to lower or raise the score. If clear background checks may be used positively and the report says clear / no records found / no hit, that can support a stronger rulesComplianceScore as one factor only. If manual review is required for consumer-report findings, do not convert a potentially adverse finding into an automatic scoring penalty; instead describe it in notes or missingItems for review. Put anything uncertain or missing into missingItems and notes.`
            }
          ]
        },
        {
          role: "user",
          content: [
            ...contentParts,
            {
              type: "input_text",
              text:
                "Return applicant data for a tenant-screening dashboard. Use 0 for missing numeric fields only when the value is truly unavailable. Set applicationSource to the best fit among Apartments.com, Zillow, TurboTenant, RentSpree, Avail, Email / Manual, or Other. Use 'New' unless the document strongly implies a more advanced pipeline status. When housing assistance is present, do not treat that alone as a negative signal; instead capture the tenant-paid portion and verification workflow fields. For coApplicants, include only real additional adults applying for the same unit, not children or references. Use the full packet to determine rentalHistoryScore, rulesComplianceScore, timelineScore, communicationScore, and documentationScore instead of leaving them at 0 when enough evidence exists. Follow fair-housing and consumer-report screening principles: do not use protected-class information, do not penalize voucher status itself, do not invent a credit score, and do not treat a missing numeric score as negative. Use clear screening outcomes like registry/criminal/OFAC clear as supportive compliance evidence when provided."
            }
          ]
        }
      ]
    });

    const parsed = extractedApplicantSchema.parse(extracted);
    const extractedText = [parsed.extractionSummary, ...parsed.notes, ...parsed.missingItems].filter(Boolean).join("\n");

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
          email: inferEmail(coApplicant.email, `${coApplicant.notes}\n${extractedText}`),
          phone: inferPhone(coApplicant.phone, `${coApplicant.notes}\n${extractedText}`),
          monthlyIncome: coApplicant.monthlyIncome,
          residentScore: coApplicant.residentScore,
          notes: normalizeExtractedString(coApplicant.notes)
        }))
        .filter((coApplicant) => coApplicant.name),
      applicationSource: inferApplicationSource(parsed.applicationSource, extractedText),
      supportProgram: normalizeExtractedString(parsed.supportProgram),
      notes: parsed.notes.filter(Boolean),
      missingItems: parsed.missingItems.filter(Boolean)
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to extract applicant data." },
      { status: 500 }
    );
  }
}
