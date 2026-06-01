import { normalizeApplicantStatus } from "@/lib/applicant-status";

export const NOTE_MAX_LENGTH = 5000;
export const RAW_SOURCE_MAX_LENGTH = 50000;

type ApplicantPayload = Record<string, unknown>;

function compactWhitespace(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function truncateText(value: unknown, maxLength: number) {
  return compactWhitespace(String(value ?? "")).slice(0, maxLength);
}

function normalizeStringList(value: unknown, maxLength: number) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\n{2,}|\r\n{2,}/)
      : [];

  return Array.from(
    new Set(
      items
        .map((item) => truncateText(item, maxLength))
        .filter(Boolean),
    ),
  );
}

function shortenNote(value: unknown) {
  const note = truncateText(value, NOTE_MAX_LENGTH);
  if (note.length < NOTE_MAX_LENGTH) return note;

  const lines = note
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
  const shortened = lines.join("\n");
  return shortened.length <= NOTE_MAX_LENGTH
    ? shortened
    : `${shortened.slice(0, NOTE_MAX_LENGTH - 80).trim()}\n[Long source material saved in audit trail.]`;
}

function normalizeFiles(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        filename: truncateText(record.filename, 255),
        type: truncateText(record.type, 120),
        size: Number(record.size ?? 0) || 0,
        uploadedAt: truncateText(record.uploadedAt, 80) || new Date().toISOString(),
        extractionStatus:
          truncateText(record.extractionStatus, 80) || "not_attempted",
      };
    })
    .filter((item): item is {
      filename: string;
      type: string;
      size: number;
      uploadedAt: string;
      extractionStatus: string;
    } => Boolean(item?.filename));
}

function normalizeMoney(value: unknown, max: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= max ? numeric : 0;
}

export function sanitizeApplicantPayload<T extends ApplicantPayload>(payload: T): T {
  const sanitized = { ...payload } as ApplicantPayload;

  const rawPastedText = truncateText(
    sanitized.rawPastedText ?? sanitized.sourceText,
    RAW_SOURCE_MAX_LENGTH,
  );
  const extractedDocumentText = truncateText(
    sanitized.extractedDocumentText ?? sanitized.documentExtracts,
    RAW_SOURCE_MAX_LENGTH,
  );
  const rawText = truncateText(
    sanitized.rawText || [rawPastedText, extractedDocumentText].filter(Boolean).join("\n\n"),
    RAW_SOURCE_MAX_LENGTH,
  );

  sanitized.rawPastedText = rawPastedText;
  sanitized.sourceText = rawPastedText;
  sanitized.extractedDocumentText = extractedDocumentText;
  sanitized.documentExtracts = extractedDocumentText;
  sanitized.rawText = rawText;
  sanitized.notes = normalizeStringList(sanitized.notes, NOTE_MAX_LENGTH).map(shortenNote);
  sanitized.importantNotes = normalizeStringList(
    sanitized.importantNotes ?? sanitized.notes,
    NOTE_MAX_LENGTH,
  ).map(shortenNote);
  sanitized.strengths = normalizeStringList(sanitized.strengths, 3000);
  sanitized.concerns = normalizeStringList(sanitized.concerns, 3000);
  sanitized.missingDocuments = normalizeStringList(sanitized.missingDocuments, 3000);
  sanitized.receivedDocuments = normalizeStringList(sanitized.receivedDocuments, 3000);
  sanitized.followUpQuestions = normalizeStringList(sanitized.followUpQuestions, 3000);
  sanitized.applicantSummary = truncateText(
    sanitized.applicantSummary ?? sanitized.summary,
    NOTE_MAX_LENGTH,
  );
  sanitized.summary = truncateText(
    sanitized.summary ?? sanitized.applicantSummary,
    NOTE_MAX_LENGTH,
  );
  sanitized.suggestedMessage = truncateText(sanitized.suggestedMessage, NOTE_MAX_LENGTH);
  sanitized.extractedFieldSummary = truncateText(sanitized.extractedFieldSummary, NOTE_MAX_LENGTH);
  sanitized.aiRecommendedStatus = truncateText(sanitized.aiRecommendedStatus, 500);
  sanitized.status = normalizeApplicantStatus(sanitized.status);
  sanitized.uploadedFiles = normalizeFiles(sanitized.uploadedFiles);
  sanitized.monthlyIncome = normalizeMoney(sanitized.monthlyIncome, 1_000_000);
  sanitized.applicantGrossMonthlyIncome = normalizeMoney(sanitized.applicantGrossMonthlyIncome, 1_000_000);
  sanitized.applicantAnnualIncome = normalizeMoney(sanitized.applicantAnnualIncome, 10_000_000);
  sanitized.applicantIncomeAmount = normalizeMoney(
    sanitized.applicantIncomeAmount ?? sanitized.incomeAmount,
    10_000_000,
  );
  sanitized.applicantIncomeFrequency = sanitized.applicantIncomeFrequency ?? sanitized.incomeFrequency ?? "unknown";
  sanitized.normalizedMonthlyIncome = normalizeMoney(
    sanitized.normalizedMonthlyIncome ?? sanitized.monthlyIncome,
    1_000_000,
  );
  sanitized.monthlyRent = normalizeMoney(sanitized.monthlyRent, 100_000);
  sanitized.propertyMonthlyRent = normalizeMoney(sanitized.propertyMonthlyRent, 100_000);
  sanitized.rentSource = truncateText(sanitized.rentSource, 120);
  sanitized.incomeSource = truncateText(sanitized.incomeSource, 120);
  sanitized.dueAtSigningSource = truncateText(sanitized.dueAtSigningSource, 200);
  sanitized.securityDepositMonths = normalizeMoney(sanitized.securityDepositMonths ?? 1, 24);
  sanitized.requireFirstMonthAtSigning = sanitized.requireFirstMonthAtSigning !== false;
  sanitized.financialFieldsCorrected = Boolean(sanitized.financialFieldsCorrected);
  sanitized.financialCorrectionNote = truncateText(sanitized.financialCorrectionNote, 500);
  sanitized.dueAtSigning = normalizeMoney(sanitized.dueAtSigning, 250_000);
  sanitized.securityDeposit = normalizeMoney(sanitized.securityDeposit, 250_000);
  sanitized.firstMonthRent = normalizeMoney(sanitized.firstMonthRent, 100_000);
  sanitized.brokerFee = normalizeMoney(sanitized.brokerFee, 250_000);
  sanitized.petFee = normalizeMoney(sanitized.petFee, 25_000);
  sanitized.otherMoveInFees = normalizeMoney(sanitized.otherMoveInFees, 250_000);
  sanitized.dueAtSigningAmount = normalizeMoney(
    sanitized.dueAtSigningAmount ?? sanitized.dueAtSigning,
    250_000,
  );
  sanitized.dueAtSigning = sanitized.dueAtSigningAmount || sanitized.dueAtSigning;
  sanitized.dueAtSigningRawText = truncateText(sanitized.dueAtSigningRawText, 500);
  sanitized.dueAtSigningNeedsConfirmation = Boolean(sanitized.dueAtSigningNeedsConfirmation);
  sanitized.tenantPortionRent = normalizeMoney(sanitized.tenantPortionRent, 100_000);
  sanitized.tenantPortion = normalizeMoney(sanitized.tenantPortion ?? sanitized.tenantPortionRent, 100_000);
  sanitized.voucherPortion = normalizeMoney(sanitized.voucherPortion ?? sanitized.monthlySubsidyAmount, 100_000);
  sanitized.securityDepositAmount = normalizeMoney(
    sanitized.securityDepositAmount ?? sanitized.securityDeposit,
    250_000,
  );
  sanitized.firstMonthRentAmount = normalizeMoney(
    sanitized.firstMonthRentAmount ?? sanitized.firstMonthRent,
    100_000,
  );

  return sanitized as T;
}
