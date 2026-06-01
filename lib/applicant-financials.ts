import {
  calculateIncomeToRentRatio,
  extractIncomeFromText,
  finiteNumber,
  normalizeIncomeToMonthly,
  type IncomeFrequency,
} from "@/lib/income";
import { extractMoveInCosts } from "@/lib/move-in-costs";

export type FinancialContext = {
  propertyMonthlyRent?: number | null;
  securityDepositMonths?: number | null;
  requireFirstMonthAtSigning?: boolean | null;
};

export type NormalizedApplicantFinancials = {
  monthlyRent: number;
  propertyMonthlyRent: number;
  monthlyIncome: number;
  incomeAmount: number | null;
  incomeFrequency: IncomeFrequency;
  normalizedMonthlyIncome: number | null;
  incomeToRentRatio: number | null;
  firstMonthRent: number;
  securityDeposit: number;
  dueAtSigning: number;
  dueAtSigningAmount: number;
  dueAtSigningNeedsConfirmation: boolean;
  applicantGrossMonthlyIncome: number | null;
  applicantAnnualIncome: number | null;
  applicantIncomeAmount: number | null;
  applicantIncomeFrequency: IncomeFrequency;
  tenantPortion: number;
  voucherPortion: number;
  securityDepositAmount: number;
  firstMonthRentAmount: number;
  rentSource: string;
  incomeSource: string;
  dueAtSigningSource: string;
  securityDepositMonths: number;
  requireFirstMonthAtSigning: boolean;
  financialFieldsCorrected: boolean;
  financialCorrectionNote: string;
};

function positive(value: unknown, max = 1_000_000) {
  const numeric = finiteNumber(value);
  return numeric !== null && numeric > 0 && numeric <= max ? numeric : null;
}

function textFromApplicant(applicant: Record<string, unknown>) {
  return [
    applicant.rawText,
    applicant.rawPastedText,
    applicant.sourceText,
    applicant.extractedDocumentText,
    applicant.documentExtracts,
    applicant.aiSummary,
    applicant.applicantSummary,
    applicant.extractedFieldSummary,
    Array.isArray(applicant.notes) ? applicant.notes.join("\n") : applicant.notes,
    Array.isArray(applicant.missingDocuments) ? applicant.missingDocuments.join("\n") : "",
  ]
    .filter(Boolean)
    .map(String)
    .join("\n");
}

function frequency(value: unknown): IncomeFrequency {
  return ["hourly", "weekly", "biweekly", "monthly", "yearly", "unknown"].includes(String(value))
    ? (String(value) as IncomeFrequency)
    : "unknown";
}

function nearlyEqual(a: number | null, b: number | null) {
  return a !== null && b !== null && Math.abs(a - b) <= Math.max(25, a * 0.02);
}

export function normalizeApplicantFinancials(
  applicant: Record<string, unknown>,
  context: FinancialContext = {},
): NormalizedApplicantFinancials {
  const sourceText = textFromApplicant(applicant);
  const extractedIncome = extractIncomeFromText(sourceText);
  const storedIncomeAmount =
    positive(applicant.applicantIncomeAmount, 10_000_000) ??
    positive(applicant.incomeAmount, 10_000_000) ??
    extractedIncome.amount;
  const storedIncomeFrequency = frequency(
    applicant.applicantIncomeFrequency ?? applicant.incomeFrequency ?? extractedIncome.frequency,
  );
  const normalizedFromAmount = normalizeIncomeToMonthly({
    amount: storedIncomeAmount,
    frequency: storedIncomeFrequency,
    hoursPerWeek: extractedIncome.hoursPerWeek,
  });
  const normalizedMonthlyIncome =
    positive(applicant.applicantGrossMonthlyIncome) ??
    positive(normalizedFromAmount) ??
    positive(applicant.normalizedMonthlyIncome) ??
    positive(applicant.monthlyIncome);
  const incomeFrequency =
    storedIncomeFrequency !== "unknown"
      ? storedIncomeFrequency
      : normalizedMonthlyIncome
        ? "monthly"
        : "unknown";
  const incomeAmount =
    storedIncomeAmount ??
    (incomeFrequency === "monthly" ? normalizedMonthlyIncome : null);
  const propertyMonthlyRent =
    positive(context.propertyMonthlyRent, 100_000) ??
    positive(applicant.propertyMonthlyRent, 100_000) ??
    null;
  const storedMonthlyRent = positive(applicant.monthlyRent, 100_000);
  const rentLooksLikeIncome =
    Boolean(propertyMonthlyRent) &&
    nearlyEqual(storedMonthlyRent, normalizedMonthlyIncome) &&
    /gross monthly income|monthly income|income|salary|earnings/i.test(sourceText);
  const monthlyRent = propertyMonthlyRent ?? (rentLooksLikeIncome ? null : storedMonthlyRent) ?? 0;
  const rentSource = propertyMonthlyRent
    ? "Property rent"
    : storedMonthlyRent && !rentLooksLikeIncome
      ? "Saved applicant rent"
      : "Needs confirmation";
  const incomeSource = normalizedMonthlyIncome
    ? "Applicant message/document"
    : "Needs confirmation";
  const securityDepositMonths =
    positive(context.securityDepositMonths, 24) ??
    positive(applicant.securityDepositMonths, 24) ??
    1;
  const requireFirstMonthAtSigning =
    context.requireFirstMonthAtSigning ?? applicant.requireFirstMonthAtSigning;
  const firstMonthRequired = requireFirstMonthAtSigning !== false;
  const extractedMoveInCosts = extractMoveInCosts(sourceText, monthlyRent || null);
  const firstMonthRent =
    positive(applicant.firstMonthRentAmount, 100_000) ??
    positive(applicant.firstMonthRent, 100_000) ??
    extractedMoveInCosts.firstMonthRent ??
    (firstMonthRequired && monthlyRent ? monthlyRent : 0);
  const securityDeposit =
    positive(applicant.securityDepositAmount, 250_000) ??
    positive(applicant.securityDeposit, 250_000) ??
    extractedMoveInCosts.securityDeposit ??
    (monthlyRent && securityDepositMonths ? monthlyRent * securityDepositMonths : 0);
  const dueAtSigning =
    positive(applicant.dueAtSigningAmount, 250_000) ??
    positive(applicant.dueAtSigning, 250_000) ??
    extractedMoveInCosts.dueAtSigningAmount ??
    (monthlyRent && (firstMonthRent || securityDeposit) ? firstMonthRent + securityDeposit : 0);
  const dueAtSigningSource = positive(applicant.dueAtSigningAmount, 250_000)
    ? "Saved due-at-signing amount"
    : extractedMoveInCosts.dueAtSigningAmount
      ? "Applicant message/document"
      : dueAtSigning
        ? "Calculated from rent + security"
        : "Needs confirmation";
  const financialFieldsCorrected = Boolean(applicant.financialFieldsCorrected) || rentLooksLikeIncome;

  return {
    monthlyRent,
    propertyMonthlyRent: propertyMonthlyRent ?? 0,
    monthlyIncome: normalizedMonthlyIncome ?? positive(applicant.monthlyIncome) ?? 0,
    incomeAmount,
    incomeFrequency,
    normalizedMonthlyIncome,
    incomeToRentRatio: calculateIncomeToRentRatio(normalizedMonthlyIncome, monthlyRent || null),
    firstMonthRent,
    securityDeposit,
    dueAtSigning,
    dueAtSigningAmount: dueAtSigning,
    dueAtSigningNeedsConfirmation: !dueAtSigning,
    applicantGrossMonthlyIncome: normalizedMonthlyIncome,
    applicantAnnualIncome:
      incomeFrequency === "yearly" ? incomeAmount : positive(applicant.applicantAnnualIncome, 10_000_000),
    applicantIncomeAmount: incomeAmount,
    applicantIncomeFrequency: incomeFrequency,
    tenantPortion: positive(applicant.tenantPortion ?? applicant.tenantPortionRent, 100_000) ?? 0,
    voucherPortion: positive(applicant.voucherPortion ?? applicant.monthlySubsidyAmount, 100_000) ?? 0,
    securityDepositAmount: securityDeposit,
    firstMonthRentAmount: firstMonthRent,
    rentSource,
    incomeSource,
    dueAtSigningSource,
    securityDepositMonths,
    requireFirstMonthAtSigning: firstMonthRequired,
    financialFieldsCorrected,
    financialCorrectionNote: rentLooksLikeIncome
      ? "Financial fields were corrected from source data. Saved rent matched applicant income, so property rent was used."
      : String(applicant.financialCorrectionNote ?? ""),
  };
}
