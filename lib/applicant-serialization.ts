import { calculateResponsibleRent, normalizeResidentScore } from "@/lib/scoring";
import { calculateIncomeToRentRatio } from "@/lib/income";
import {
  normalizeApplicantFinancials,
  type FinancialContext,
} from "@/lib/applicant-financials";

const sourceDetectors = [
  { value: "Apartments.com", pattern: /apartments\.com/i },
  { value: "Zillow", pattern: /\bzillow\b/i },
  { value: "TurboTenant", pattern: /\bturbotenant\b/i },
  { value: "RentSpree", pattern: /\brentspree\b/i },
  { value: "Avail", pattern: /\bavail\b/i }
] as const;

function normalizeNotes(notes: unknown) {
  if (Array.isArray(notes)) {
    return notes
      .map((note) => String(note).trim())
      .filter(Boolean);
  }

  if (typeof notes !== "string") {
    return [];
  }

  return notes
    .split(/\n{2,}|\r\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);
}

function inferApplicationSource(applicationSource: unknown, notes: string[]) {
  const currentSource = typeof applicationSource === "string" ? applicationSource.trim() : "";

  if (currentSource && currentSource !== "Email / Manual") {
    return currentSource;
  }

  const noteText = notes.join("\n");
  const detected = sourceDetectors.find((source) => source.pattern.test(noteText));
  return detected?.value ?? (currentSource || "Email / Manual");
}

function inferResidentScore(residentScore: unknown, notes: string[]) {
  const numericResidentScore = Number(residentScore ?? 0);
  if (Number.isFinite(numericResidentScore) && numericResidentScore > 0) {
    return numericResidentScore;
  }

  const noteText = notes.join("\n");
  const match = noteText.match(/resident(?:\s+or\s+screening)?\s*score[^0-9]{0,12}(\d{2,3}(?:\.\d+)?)/i);

  if (!match) {
    return 0;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCoApplicants(coApplicants: unknown) {
  if (!Array.isArray(coApplicants)) {
    return [];
  }

  return coApplicants
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";

      if (!name) {
        return null;
      }

      return {
        name,
        email: typeof record.email === "string" ? record.email.trim().toLowerCase() : "",
        phone: typeof record.phone === "string" ? record.phone.trim() : "",
        monthlyIncome: Number(record.monthlyIncome ?? 0),
        residentScore: Number(record.residentScore ?? 0),
        notes: typeof record.notes === "string" ? record.notes.trim() : ""
      };
    })
    .filter((item): item is { name: string; email: string; phone: string; monthlyIncome: number; residentScore: number; notes: string } => Boolean(item));
}

function finiteNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function nullableFiniteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function positiveFiniteNumber(value: unknown) {
  const numeric = nullableFiniteNumber(value);
  return numeric !== null && numeric > 0 ? numeric : null;
}

export function serializeApplicantRecord(
  applicant: Record<string, unknown>,
  financialContext: FinancialContext = {},
) {
  const scores = (applicant.scores ?? {}) as Record<string, unknown>;
  const normalizedNotes = normalizeNotes(applicant.notes);
  const normalizedCoApplicants = normalizeCoApplicants(applicant.coApplicants);
  const recoveredResidentScore = inferResidentScore(applicant.residentScore, normalizedNotes);
  const housingSupport = typeof applicant.housingSupport === "string" ? applicant.housingSupport : "None";
  const financials = normalizeApplicantFinancials(applicant, financialContext);
  const monthlyRent = financials.monthlyRent;
  const monthlyIncome = financials.monthlyIncome;
  const dueAtSigning = financials.dueAtSigningAmount;
  const securityDeposit = financials.securityDeposit;
  const firstMonthRent = financials.firstMonthRent;
  const brokerFee = finiteNumber(applicant.brokerFee);
  const petFee = finiteNumber(applicant.petFee);
  const otherMoveInFees = finiteNumber(applicant.otherMoveInFees);
  const incomeAmount = financials.incomeAmount;
  const incomeFrequency = financials.incomeFrequency;
  const normalizedMonthlyIncome = financials.normalizedMonthlyIncome;
  const storedIncomeToRentRatio = financials.incomeToRentRatio;
  const monthlySubsidyAmount = finiteNumber(applicant.monthlySubsidyAmount);
  const tenantPortionRent = finiteNumber(applicant.tenantPortionRent);
  const responsibleRent = Number(applicant.responsibleRent ?? 0) || calculateResponsibleRent({
    monthlyRent,
    housingSupport: housingSupport as "None" | "Voucher" | "Subsidy",
    monthlySubsidyAmount,
    tenantPortionRent
  });
  const storedResidentBreakdown = Number(scores.resident ?? 0);
  const normalizedResidentScore =
    Number.isFinite(storedResidentBreakdown) && storedResidentBreakdown > 0
      ? storedResidentBreakdown
      : normalizeResidentScore(recoveredResidentScore);
  const affordabilityRatio =
    positiveFiniteNumber(applicant.affordabilityRatio) ??
    storedIncomeToRentRatio ??
    calculateIncomeToRentRatio(normalizedMonthlyIncome || null, responsibleRent || monthlyRent || null) ??
    0;

  return {
    ...applicant,
    propertyAddress: typeof applicant.propertyAddress === "string" ? applicant.propertyAddress : "",
    propertyId: applicant.propertyId ? String(applicant.propertyId) : "",
    propertyUnit: typeof applicant.propertyUnit === "string" ? applicant.propertyUnit : "",
    propertyNickname: typeof applicant.propertyNickname === "string" ? applicant.propertyNickname : "",
    borough: typeof applicant.borough === "string" ? applicant.borough : "",
    neighborhood: typeof applicant.neighborhood === "string" ? applicant.neighborhood : "",
    utilitiesIncluded: Boolean(applicant.utilitiesIncluded),
    bedrooms: nullableFiniteNumber(applicant.bedrooms),
    bathrooms: nullableFiniteNumber(applicant.bathrooms),
    propertyMonthlyRent: financials.propertyMonthlyRent,
    rentSource: financials.rentSource,
    incomeSource: financials.incomeSource,
    dueAtSigningSource: financials.dueAtSigningSource,
    securityDepositMonths: financials.securityDepositMonths,
    requireFirstMonthAtSigning: financials.requireFirstMonthAtSigning,
    financialFieldsCorrected: financials.financialFieldsCorrected,
    financialCorrectionNote: financials.financialCorrectionNote,
    applicationSource: inferApplicationSource(applicant.applicationSource, normalizedNotes),
    propertyCity: typeof applicant.propertyCity === "string" ? applicant.propertyCity : "",
    propertyState: typeof applicant.propertyState === "string" ? applicant.propertyState : "",
    propertyPostalCode: typeof applicant.propertyPostalCode === "string" ? applicant.propertyPostalCode : "",
    moveInDate: typeof applicant.moveInDate === "string" ? applicant.moveInDate : "",
    housingSupport,
    supportProgram: typeof applicant.supportProgram === "string" ? applicant.supportProgram : "",
    coApplicants: normalizedCoApplicants,
    monthlyRent,
    monthlyIncome,
    dueAtSigning,
    dueAtSigningAmount: dueAtSigning,
    dueAtSigningRawText:
      typeof applicant.dueAtSigningRawText === "string" ? applicant.dueAtSigningRawText : "",
    dueAtSigningNeedsConfirmation: Boolean(applicant.dueAtSigningNeedsConfirmation),
    securityDeposit,
    firstMonthRent,
    firstMonthRentAmount: financials.firstMonthRentAmount,
    securityDepositAmount: financials.securityDepositAmount,
    brokerFee,
    petFee,
    otherMoveInFees,
    incomeAmount,
    incomeFrequency,
    applicantGrossMonthlyIncome: financials.applicantGrossMonthlyIncome,
    applicantAnnualIncome: financials.applicantAnnualIncome,
    applicantIncomeAmount: financials.applicantIncomeAmount,
    applicantIncomeFrequency: financials.applicantIncomeFrequency,
    normalizedMonthlyIncome,
    incomeToRentRatio: storedIncomeToRentRatio,
    tenantPortion: financials.tenantPortion,
    voucherPortion: financials.voucherPortion,
    monthlySubsidyAmount,
    tenantPortionRent,
    responsibleRent,
    affordabilityRatio,
    subsidyStatus: typeof applicant.subsidyStatus === "string" ? applicant.subsidyStatus : "N/A",
    inspectionStatus: typeof applicant.inspectionStatus === "string" ? applicant.inspectionStatus : "N/A",
    residentScore: recoveredResidentScore,
    notes: normalizedNotes,
    rawText: typeof applicant.rawText === "string" ? applicant.rawText : "",
    rawPastedText: typeof applicant.rawPastedText === "string" ? applicant.rawPastedText : "",
    sourceText: typeof applicant.sourceText === "string" ? applicant.sourceText : "",
    extractedDocumentText:
      typeof applicant.extractedDocumentText === "string" ? applicant.extractedDocumentText : "",
    documentExtracts:
      typeof applicant.documentExtracts === "string" ? applicant.documentExtracts : "",
    aiSummary: typeof applicant.aiSummary === "string" ? applicant.aiSummary : "",
    aiRecommendedStatus:
      typeof applicant.aiRecommendedStatus === "string" ? applicant.aiRecommendedStatus : "",
    aiRecommendation:
      typeof applicant.aiRecommendation === "string" ? applicant.aiRecommendation : "",
    suggestedMessage:
      typeof applicant.suggestedMessage === "string" ? applicant.suggestedMessage : "",
    extractedFieldSummary:
      typeof applicant.extractedFieldSummary === "string" ? applicant.extractedFieldSummary : "",
    missingDocuments: normalizeNotes(applicant.missingDocuments),
    receivedDocuments: normalizeNotes(applicant.receivedDocuments),
    followUpQuestions: normalizeNotes(applicant.followUpQuestions),
    importantNotes: normalizeNotes(applicant.importantNotes),
    aiStrengths: normalizeNotes(applicant.aiStrengths),
    aiRedFlags: normalizeNotes(applicant.aiRedFlags),
    uploadedFiles: Array.isArray(applicant.uploadedFiles) ? applicant.uploadedFiles : [],
    updateHistory: Array.isArray(applicant.updateHistory)
      ? applicant.updateHistory
      : [],
    extractedFields:
      applicant.extractedFields && typeof applicant.extractedFields === "object"
        ? applicant.extractedFields
        : {},
    scores: {
      ...scores,
      resident: normalizedResidentScore
    },
    _id: String(applicant._id),
    organizationId: String(applicant.organizationId),
    ownerId: String(applicant.ownerId),
    createdAt: new Date(String(applicant.createdAt)).toISOString(),
    updatedAt: new Date(String(applicant.updatedAt)).toISOString()
  };
}
