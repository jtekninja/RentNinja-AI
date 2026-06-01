import {
  extractIncomeFromText,
  extractRentFromText,
  normalizeIncomeToMonthly,
  parseMoneyAmount,
  type IncomeFrequency,
} from "@/lib/income";
import { extractMoveInCosts, formatDueAtSigningBreakdown } from "@/lib/move-in-costs";

export type UpdateCategory =
  | "Landlord Terms"
  | "Applicant Information"
  | "Screening Documents"
  | "AI Notes";

export type ClassifiedApplicantUpdate = {
  category: UpdateCategory;
  field:
    | "monthlyRent"
    | "dueAtSigning"
    | "dueAtSigningAmount"
    | "dueAtSigningRawText"
    | "dueAtSigningNeedsConfirmation"
    | "securityDeposit"
    | "firstMonthRent"
    | "brokerFee"
    | "petFee"
    | "otherMoveInFees"
    | "monthlyIncome"
    | "incomeToRentRatio"
    | "tenantPortionRent"
    | "creditScore"
    | "missingDocuments"
    | "receivedDocuments"
    | "notes";
  label: string;
  oldValue: string;
  newValue: string;
  numericValue?: number | null;
  confidence: "Low" | "Medium" | "High";
  safeToApply: boolean;
  reason: string;
};

type ExistingApplicantTerms = {
  monthlyRent?: number | null;
  monthlyIncome?: number | null;
  incomeAmount?: number | null;
  incomeFrequency?: IncomeFrequency | null;
  normalizedMonthlyIncome?: number | null;
  incomeToRentRatio?: number | null;
  tenantPortionRent?: number | null;
  dueAtSigning?: number | null;
  dueAtSigningAmount?: number | null;
  dueAtSigningRawText?: string | null;
  dueAtSigningNeedsConfirmation?: boolean | null;
  securityDeposit?: number | null;
  firstMonthRent?: number | null;
  brokerFee?: number | null;
  petFee?: number | null;
  otherMoveInFees?: number | null;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const incomeKeywords =
  /\b(income|salary|salaried|wages?|earnings?|earns?|makes?|pay(?:stub|check|roll)?|paid|employer|employment|job)\b/i;
const landlordTermsKeywords =
  /\b(rent|security|deposit|due at signing|move[- ]?in funds?|lease start|utilities?|pet fee|occupancy)\b/i;

function formatMoney(value: number | null | undefined) {
  return value && Number.isFinite(value) && value > 0
    ? currency.format(value)
    : "Not provided";
}

function formatRatio(value: number | null | undefined) {
  return value && Number.isFinite(value) && value > 0
    ? `${value.toFixed(1)}x`
    : "Income-to-rent ratio not calculated — applicant income not available.";
}

function saneMoney(value: number | null | undefined, max = 250_000) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= max
  );
}

function getExistingMonthlyIncome(existing: ExistingApplicantTerms) {
  if (saneMoney(existing.normalizedMonthlyIncome)) {
    return existing.normalizedMonthlyIncome ?? null;
  }

  const normalizedAmount = normalizeIncomeToMonthly({
    amount: existing.incomeAmount ?? null,
    frequency: existing.incomeFrequency ?? "unknown",
  });
  if (saneMoney(normalizedAmount)) return normalizedAmount;

  if (
    existing.incomeFrequency === "yearly" &&
    saneMoney(existing.monthlyIncome, 5_000_000)
  ) {
    return (existing.monthlyIncome ?? 0) / 12;
  }

  return saneMoney(existing.monthlyIncome) ? existing.monthlyIncome ?? null : null;
}

export function calculateIncomeToRentRatio(
  existingIncome: number | null | undefined,
  newIncome: number | null | undefined,
  existingRent: number | null | undefined,
  newRent: number | null | undefined,
) {
  const monthlyIncome = saneMoney(newIncome)
    ? newIncome ?? null
    : saneMoney(existingIncome)
      ? existingIncome ?? null
      : null;
  const monthlyRent = saneMoney(newRent, 100_000)
    ? newRent ?? null
    : saneMoney(existingRent, 100_000)
      ? existingRent ?? null
      : null;

  if (!monthlyIncome || !monthlyRent) return null;

  return monthlyIncome / monthlyRent;
}

function extractDueAtSigning(text: string) {
  const match = text.match(
    /\$?\s*([\d,.]+(?:\.\d+)?)\s*(?:is\s+)?(?:due at signing|due before move[- ]?in|move[- ]?in funds?)/i,
  );
  if (match) return parseMoneyAmount(match[1]);

  const reverseMatch = text.match(
    /(?:due at signing|due before move[- ]?in|move[- ]?in funds?)[^$\d]{0,20}\$?\s*([\d,.]+(?:\.\d+)?)/i,
  );
  return reverseMatch ? parseMoneyAmount(reverseMatch[1]) : null;
}

function extractSecurityDeposit(text: string) {
  const match = text.match(
    /(?:security(?: deposit)?|deposit)[^$\d]{0,20}\$?\s*([\d,.]+(?:\.\d+)?)/i,
  );
  if (match) return parseMoneyAmount(match[1]);

  const reverseMatch = text.match(
    /\$?\s*([\d,.]+(?:\.\d+)?)\s*(?:security(?: deposit)?|deposit)\b/i,
  );
  return reverseMatch ? parseMoneyAmount(reverseMatch[1]) : null;
}

function extractTenantPortion(text: string) {
  const match = text.match(
    /tenant portion[^$\d]{0,30}\$?\s*([\d,.]+(?:\.\d+)?)/i,
  );
  if (match) return parseMoneyAmount(match[1]);

  const reverseMatch = text.match(
    /\$?\s*([\d,.]+(?:\.\d+)?)\s*(?:is\s+)?tenant portion/i,
  );
  return reverseMatch ? parseMoneyAmount(reverseMatch[1]) : null;
}

function isIncomeExplicit(text: string) {
  return incomeKeywords.test(text);
}

function hasOnlyLandlordTerms(text: string) {
  return landlordTermsKeywords.test(text) && !isIncomeExplicit(text);
}

export function classifyApplicantUpdateText(
  rawText: string,
  existing: ExistingApplicantTerms = {},
): ClassifiedApplicantUpdate[] {
  const text = rawText.trim();
  if (!text) return [];

  const updates: ClassifiedApplicantUpdate[] = [];
  const rent = extractRentFromText(text).amount;
  const tenantPortion = extractTenantPortion(text);
  const explicitIncome = isIncomeExplicit(text);
  const landlordOnly = hasOnlyLandlordTerms(text);
  const income = explicitIncome
    ? extractIncomeFromText(text)
    : {
        amount: null,
        frequency: "unknown" as IncomeFrequency,
        rawText: "",
      };
  const monthlyIncome = explicitIncome
    ? normalizeIncomeToMonthly({
        amount: income.amount,
        frequency: income.frequency,
        hoursPerWeek: income.hoursPerWeek,
      })
    : null;
  const candidateRent = saneMoney(rent, 50_000) ? rent : null;
  const moveInCosts = extractMoveInCosts(text, candidateRent ?? existing.monthlyRent ?? null);
  const dueAtSigning =
    moveInCosts.dueAtSigningAmount ?? extractDueAtSigning(text);
  const securityDeposit =
    moveInCosts.securityDeposit ?? extractSecurityDeposit(text);
  const existingMonthlyIncome = getExistingMonthlyIncome(existing);
  const candidateIncome =
    saneMoney(monthlyIncome) && monthlyIncome !== candidateRent ? monthlyIncome : null;

  if (candidateRent) {
    updates.push({
      category: "Landlord Terms",
      field: "monthlyRent",
      label: "Monthly rent",
      oldValue: `${formatMoney(existing.monthlyRent)}/month`,
      newValue: `${formatMoney(candidateRent)}/month`,
      numericValue: candidateRent,
      confidence: "High",
      safeToApply: true,
      reason: "Text describes rent or monthly landlord terms.",
    });
  }

  if (saneMoney(dueAtSigning, 100_000)) {
    updates.push({
      category: "Landlord Terms",
      field: "dueAtSigning",
      label: "Due at signing",
      oldValue: formatMoney(existing.dueAtSigningAmount ?? existing.dueAtSigning),
      newValue: formatMoney(dueAtSigning),
      numericValue: dueAtSigning,
      confidence: "High",
      safeToApply: true,
      reason: "Move-in funds are landlord terms, not applicant income.",
    });
    updates.push({
      category: "Landlord Terms",
      field: "dueAtSigningAmount",
      label: "Due at signing amount",
      oldValue: formatMoney(existing.dueAtSigningAmount ?? existing.dueAtSigning),
      newValue: formatMoney(dueAtSigning),
      numericValue: dueAtSigning,
      confidence: "High",
      safeToApply: true,
      reason: "Structured move-in cost total for proof-of-funds and applicant detail display.",
    });
  }

  if (moveInCosts.dueAtSigningRawText) {
    updates.push({
      category: "Landlord Terms",
      field: "dueAtSigningRawText",
      label: "Due at signing source",
      oldValue: existing.dueAtSigningRawText ?? "",
      newValue: moveInCosts.dueAtSigningRawText,
      confidence: "High",
      safeToApply: true,
      reason: "Keeps the original due-at-signing phrase for audit history.",
    });
  }

  if (saneMoney(moveInCosts.firstMonthRent, 100_000)) {
    updates.push({
      category: "Landlord Terms",
      field: "firstMonthRent",
      label: "First month rent",
      oldValue: formatMoney(existing.firstMonthRent),
      newValue: formatMoney(moveInCosts.firstMonthRent),
      numericValue: moveInCosts.firstMonthRent,
      confidence: "High",
      safeToApply: true,
      reason: "First month rent is part of move-in costs.",
    });
  }

  if (saneMoney(securityDeposit, 100_000)) {
    updates.push({
      category: "Landlord Terms",
      field: "securityDeposit",
      label: "Security deposit",
      oldValue: formatMoney(existing.securityDeposit),
      newValue: formatMoney(securityDeposit),
      numericValue: securityDeposit,
      confidence: "High",
      safeToApply: true,
      reason: "Security deposit is a landlord term, not applicant income.",
    });
  }

  for (const [field, label, value] of [
    ["brokerFee", "Broker fee", moveInCosts.brokerFee],
    ["petFee", "Pet fee", moveInCosts.petFee],
    ["otherMoveInFees", "Other move-in fees", moveInCosts.otherMoveInFees],
  ] as const) {
    if (saneMoney(value, 250_000)) {
      updates.push({
        category: "Landlord Terms",
        field,
        label,
        oldValue: formatMoney(existing[field]),
        newValue: formatMoney(value),
        numericValue: value,
        confidence: "High",
        safeToApply: true,
        reason: "Structured move-in cost item.",
      });
    }
  }

  if (moveInCosts.dueAtSigningNeedsConfirmation) {
    updates.push({
      category: "AI Notes",
      field: "notes",
      label: "Due at signing breakdown",
      oldValue: "",
      newValue: `Due at signing breakdown: ${formatDueAtSigningBreakdown(moveInCosts)}`,
      confidence: "High",
      safeToApply: true,
      reason: "Total was found, but the detailed breakdown still needs confirmation.",
    });
  } else if (
    dueAtSigning &&
    /includes security|including security|security included/i.test(text)
  ) {
    updates.push({
      category: "Landlord Terms",
      field: "notes",
      label: "Security deposit",
      oldValue: "",
      newValue: "Security deposit appears included in due-at-signing amount.",
      confidence: "High",
      safeToApply: true,
      reason: "Text says due at signing includes security.",
    });
  }

  if (saneMoney(tenantPortion, 50_000)) {
    updates.push({
      category: "Applicant Information",
      field: "tenantPortionRent",
      label: "Tenant portion",
      oldValue: `${formatMoney(existing.tenantPortionRent)}/month`,
      newValue: `${formatMoney(tenantPortion)}/month`,
      numericValue: tenantPortion,
      confidence: "High",
      safeToApply: true,
      reason: "Tenant portion is rent responsibility, not income.",
    });
  }

  if (explicitIncome && candidateIncome) {
    const ratio = calculateIncomeToRentRatio(
      existingMonthlyIncome,
      candidateIncome,
      existing.monthlyRent ?? null,
      candidateRent ?? existing.monthlyRent ?? null,
    );
    updates.push({
      category: "Applicant Information",
      field: "monthlyIncome",
      label: "Monthly income",
      oldValue: `${formatMoney(existing.monthlyIncome)}/month`,
      newValue: `${formatMoney(candidateIncome)}/month`,
      numericValue: candidateIncome,
      confidence: "High",
      safeToApply: true,
      reason: "Text clearly identifies applicant income.",
    });
    updates.push({
      category: "Applicant Information",
      field: "incomeToRentRatio",
      label: "Income-to-rent ratio",
      oldValue: formatRatio(existing.incomeToRentRatio),
      newValue: formatRatio(ratio),
      numericValue: ratio,
      confidence: ratio ? "High" : "Low",
      safeToApply: Boolean(ratio),
      reason: ratio
        ? "Calculated from applicant income divided by monthly rent."
        : "Cannot calculate without both applicant income and rent.",
    });
  } else if (landlordOnly) {
    const ratio = calculateIncomeToRentRatio(
      existingMonthlyIncome,
      null,
      existing.monthlyRent ?? null,
      candidateRent ?? null,
    );

    if (ratio) {
      updates.push({
        category: "Applicant Information",
        field: "incomeToRentRatio",
        label: "Income-to-rent ratio",
        oldValue: formatRatio(existing.incomeToRentRatio),
        newValue: formatRatio(ratio),
        numericValue: ratio,
        confidence: "High",
        safeToApply: true,
        reason:
          "No new income was provided; existing saved applicant income was preserved and used with the updated rent.",
      });
    }

    updates.push({
      category: "AI Notes",
      field: "notes",
      label: "Income-to-rent ratio",
      oldValue: formatRatio(existing.incomeToRentRatio),
      newValue:
        existingMonthlyIncome && ratio && candidateRent
          ? `No new income provided. Existing saved applicant income was preserved and used to recalculate income-to-rent ratio.\nCurrent saved income: ${formatMoney(existingMonthlyIncome)}/month\nUpdated rent: ${formatMoney(candidateRent)}/month\nNew ratio: ${formatRatio(ratio)} rent`
          : "Income-to-rent ratio not calculated — applicant income not available.",
      confidence: "High",
      safeToApply: false,
      reason: existingMonthlyIncome
        ? "Pasted text only contains landlord terms; saved applicant income remains unchanged."
        : "Pasted text only contains landlord terms and no saved applicant income is available.",
    });
  }

  return updates;
}
