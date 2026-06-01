import {
  calculateIncomeToRentRatio,
  classifyApplicantUpdateText,
  type ClassifiedApplicantUpdate,
  type UpdateCategory,
} from "@/lib/applicant-update-classifier";
import { normalizeIncomeToMonthly } from "@/lib/income";
import { normalizeApplicantStatus } from "@/lib/applicant-status";

export type ApplicantUpdateHistoryEntry = {
  updatedAt: string;
  sourceText: string;
  fieldsChanged: {
    field: string;
    label: string;
    oldValue: unknown;
    newValue: unknown;
    confidence: "Low" | "Medium" | "High";
    reason: string;
  }[];
};

export type ApplicantMergeReviewRow = {
  category: UpdateCategory;
  field: string;
  label: string;
  currentValue: string;
  newInfo: string;
  finalValue: string;
  confidence: "Low" | "Medium" | "High";
  willApply: boolean;
  reason: string;
};

export type ApplicantUpdateMergeResult<T extends Record<string, unknown>> = {
  existingApplicant: T;
  suggestedUpdates: ClassifiedApplicantUpdate[];
  mergedApplicant: T;
  reviewRows: ApplicantMergeReviewRow[];
  updateLog: ApplicantUpdateHistoryEntry;
};

type ApplicantLike = Record<string, unknown> & {
  monthlyIncome?: number | null;
  monthlyRent?: number | null;
  incomeAmount?: number | null;
  incomeFrequency?: "hourly" | "weekly" | "biweekly" | "monthly" | "yearly" | "unknown";
  normalizedMonthlyIncome?: number | null;
  incomeToRentRatio?: number | null;
  dueAtSigning?: number | null;
  dueAtSigningAmount?: number | null;
  dueAtSigningRawText?: string | null;
  dueAtSigningNeedsConfirmation?: boolean | null;
  securityDeposit?: number | null;
  firstMonthRent?: number | null;
  brokerFee?: number | null;
  petFee?: number | null;
  otherMoveInFees?: number | null;
  tenantPortionRent?: number | null;
  creditScore?: number | null;
  status?: unknown;
  missingDocuments?: string[];
  receivedDocuments?: string[];
  updateHistory?: ApplicantUpdateHistoryEntry[];
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function finiteNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function positiveMoney(value: unknown, max = 250_000) {
  const numeric = finiteNumber(value);
  return numeric !== null && numeric > 0 && numeric <= max ? numeric : null;
}

function formatMoney(value: unknown) {
  const numeric = finiteNumber(value);
  return numeric !== null && numeric > 0
    ? currency.format(numeric)
    : "Not provided";
}

function formatMonthlyMoney(value: unknown) {
  const numeric = finiteNumber(value);
  return numeric !== null && numeric > 0
    ? `${currency.format(numeric)}/month`
    : "Not provided";
}

function formatRatio(value: unknown) {
  const numeric = finiteNumber(value);
  return numeric !== null && numeric > 0
    ? `${numeric.toFixed(1)}x`
    : "Not calculated";
}

function normalizeDocName(value: string) {
  const normalized = value.trim().toLowerCase();
  if (/\b(id|license|passport)\b/.test(normalized)) return "ID";
  if (/bank/.test(normalized)) return "bank statements";
  if (/pay|income|stub/.test(normalized)) return "proof of income";
  return value.trim();
}

function uniqueList(values: unknown) {
  if (!Array.isArray(values)) return [];
  return Array.from(
    new Set(values.map((item) => String(item).trim()).filter(Boolean)),
  );
}

export function getSavedMonthlyIncome(applicant: ApplicantLike) {
  const normalized = positiveMoney(applicant.normalizedMonthlyIncome);
  if (normalized !== null) return normalized;

  const normalizedAmount = normalizeIncomeToMonthly({
    amount: positiveMoney(applicant.incomeAmount, 5_000_000),
    frequency: applicant.incomeFrequency ?? "unknown",
  });
  if (positiveMoney(normalizedAmount) !== null) return normalizedAmount;

  const rawIncome = positiveMoney(applicant.monthlyIncome, 5_000_000);
  if (rawIncome === null) return null;

  return applicant.incomeFrequency === "yearly" ? rawIncome / 12 : rawIncome;
}

export async function loadExistingApplicant<T extends ApplicantLike>(
  applicantId: string,
  fallback?: T,
): Promise<T> {
  const response = await fetch(`/api/applicants/${applicantId}`);
  if (!response.ok) {
    if (fallback) return fallback;
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Could not load saved applicant.");
  }

  return (await response.json()) as T;
}

function classifyDocumentUpdates(
  text: string,
  existing: ApplicantLike,
): ClassifiedApplicantUpdate[] {
  const updates: ClassifiedApplicantUpdate[] = [];
  const sentId = /\b(applicant\s+)?sent\s+(?:an?\s+)?(?:id|license|passport)\b|\b(id|license|passport)\s+(?:sent|received|attached|uploaded)\b/i.test(text);

  if (sentId) {
    const received = uniqueList(existing.receivedDocuments);
    const missing = uniqueList(existing.missingDocuments);
    const finalReceived = Array.from(new Set([...received, "ID"]));
    const finalMissing = missing.filter(
      (item) => normalizeDocName(item) !== "ID",
    );

    updates.push({
      category: "Screening Documents",
      field: "receivedDocuments",
      label: "Received documents",
      oldValue: received.join(", ") || "None",
      newValue: finalReceived.join(", "),
      confidence: "High",
      safeToApply: true,
      reason: "New text says the applicant sent ID.",
    });
    updates.push({
      category: "Screening Documents",
      field: "missingDocuments",
      label: "Missing documents",
      oldValue: missing.join(", ") || "None",
      newValue: finalMissing.join(", ") || "None",
      confidence: "High",
      safeToApply: true,
      reason: "ID is no longer missing because it was marked received.",
    });
  }

  return updates;
}

function classifyCreditUpdates(
  text: string,
  existing: ApplicantLike,
): ClassifiedApplicantUpdate[] {
  const match = text.match(
    /credit(?:\s+score)?(?:\s+is|\s+was|\s+actually|:)?[^0-9]{0,16}(\d{3})/i,
  );
  if (!match) return [];

  const score = Number(match[1]);
  if (!Number.isFinite(score) || score < 300 || score > 850) return [];

  return [
    {
      category: "Applicant Information" as const,
      field: "creditScore",
      label: "Credit score",
      oldValue: String(existing.creditScore ?? "Not provided"),
      newValue: String(score),
      numericValue: score,
      confidence: "High" as const,
      safeToApply: true,
      reason: "New text clearly states an updated credit score.",
    },
  ];
}

export function classifyNewInfo<T extends ApplicantLike>(
  newText: string,
  existingApplicant: T,
) {
  return [
    ...classifyApplicantUpdateText(newText, {
      monthlyRent: finiteNumber(existingApplicant.monthlyRent),
      monthlyIncome: finiteNumber(existingApplicant.monthlyIncome),
      incomeAmount: finiteNumber(existingApplicant.incomeAmount),
      incomeFrequency: existingApplicant.incomeFrequency ?? "unknown",
      normalizedMonthlyIncome: finiteNumber(existingApplicant.normalizedMonthlyIncome),
      incomeToRentRatio: finiteNumber(existingApplicant.incomeToRentRatio),
      tenantPortionRent: finiteNumber(existingApplicant.tenantPortionRent),
      dueAtSigning: finiteNumber(existingApplicant.dueAtSigning),
      dueAtSigningAmount: finiteNumber(existingApplicant.dueAtSigningAmount),
      dueAtSigningRawText: typeof existingApplicant.dueAtSigningRawText === "string"
        ? existingApplicant.dueAtSigningRawText
        : "",
      dueAtSigningNeedsConfirmation: Boolean(existingApplicant.dueAtSigningNeedsConfirmation),
      securityDeposit: finiteNumber(existingApplicant.securityDeposit),
      firstMonthRent: finiteNumber(existingApplicant.firstMonthRent),
      brokerFee: finiteNumber(existingApplicant.brokerFee),
      petFee: finiteNumber(existingApplicant.petFee),
      otherMoveInFees: finiteNumber(existingApplicant.otherMoveInFees),
    }),
    ...classifyDocumentUpdates(newText, existingApplicant),
    ...classifyCreditUpdates(newText, existingApplicant),
  ];
}

export function preserveExistingUnlessConfident<T>(
  existingValue: T,
  suggestedValue: T,
  confidence: "Low" | "Medium" | "High",
) {
  if (confidence !== "High") return existingValue;
  if (suggestedValue === null || suggestedValue === undefined || suggestedValue === "") {
    return existingValue;
  }
  return suggestedValue;
}

export function recalculateApplicantDerivedFields<T extends ApplicantLike>(
  applicant: T,
): T {
  const monthlyIncome = getSavedMonthlyIncome(applicant);
  const monthlyRent = positiveMoney(applicant.monthlyRent, 100_000);

  return {
    ...applicant,
    normalizedMonthlyIncome: monthlyIncome,
    incomeToRentRatio: calculateIncomeToRentRatio(
      monthlyIncome,
      null,
      monthlyRent,
      null,
    ),
    status: normalizeApplicantStatus(applicant.status),
  };
}

function applySuggestedUpdate<T extends ApplicantLike>(
  merged: T,
  update: ClassifiedApplicantUpdate,
) {
  if (!update.safeToApply || update.confidence !== "High") return merged;

  const amount = positiveMoney(update.numericValue, 1_000_000);
  const next: ApplicantLike = { ...merged };

  if (update.field === "monthlyRent" && amount !== null) {
    next.monthlyRent = amount;
  } else if (update.field === "dueAtSigning" && amount !== null) {
    next.dueAtSigning = amount;
    next.dueAtSigningAmount = amount;
  } else if (update.field === "dueAtSigningAmount" && amount !== null) {
    next.dueAtSigningAmount = amount;
    next.dueAtSigning = amount;
  } else if (update.field === "firstMonthRent" && amount !== null) {
    next.firstMonthRent = amount;
  } else if (update.field === "securityDeposit" && amount !== null) {
    next.securityDeposit = amount;
  } else if (update.field === "brokerFee" && amount !== null) {
    next.brokerFee = amount;
  } else if (update.field === "petFee" && amount !== null) {
    next.petFee = amount;
  } else if (update.field === "otherMoveInFees" && amount !== null) {
    next.otherMoveInFees = amount;
  } else if (update.field === "dueAtSigningRawText") {
    next.dueAtSigningRawText = update.newValue.slice(0, 500);
  } else if (update.field === "dueAtSigningNeedsConfirmation") {
    next.dueAtSigningNeedsConfirmation = /true|yes|needs/i.test(update.newValue);
  } else if (update.field === "monthlyIncome" && amount !== null) {
    next.monthlyIncome = amount;
    next.normalizedMonthlyIncome = amount;
    next.incomeFrequency = "monthly";
    next.incomeAmount = amount;
  } else if (update.field === "tenantPortionRent" && amount !== null) {
    next.tenantPortionRent = amount;
  } else if (update.field === "creditScore" && amount !== null) {
    next.creditScore = amount;
  } else if (update.field === "receivedDocuments") {
    next.receivedDocuments = update.newValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  } else if (update.field === "missingDocuments") {
    next.missingDocuments =
      update.newValue === "None"
        ? []
        : update.newValue.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return next as T;
}

function valueForField(applicant: ApplicantLike, field: string) {
  return applicant[field];
}

function displayFieldValue(applicant: ApplicantLike, field: string) {
  if (field === "monthlyRent" || field === "monthlyIncome") {
    return formatMonthlyMoney(applicant[field]);
  }
  if (
    field === "dueAtSigning" ||
    field === "dueAtSigningAmount" ||
    field === "securityDeposit" ||
    field === "firstMonthRent" ||
    field === "brokerFee" ||
    field === "petFee" ||
    field === "otherMoveInFees"
  ) {
    return formatMoney(applicant[field]);
  }
  if (field === "incomeToRentRatio") {
    return formatRatio(applicant[field]);
  }
  if (field === "receivedDocuments" || field === "missingDocuments") {
    return uniqueList(applicant[field]).join(", ") || "None";
  }
  return String(applicant[field] ?? "Not provided");
}

export function createApplicantUpdateHistory(
  applicantId: string,
  sourceText: string,
  reviewRows: ApplicantMergeReviewRow[],
): ApplicantUpdateHistoryEntry {
  void applicantId;
  return {
    updatedAt: new Date().toISOString(),
    sourceText,
    fieldsChanged: reviewRows
      .filter((row) => row.willApply)
      .map((row) => ({
        field: row.field,
        label: row.label,
        oldValue: row.currentValue,
        newValue: row.finalValue,
        confidence: row.confidence,
        reason: row.reason,
      })),
  };
}

export function mergeApplicantUpdate<T extends ApplicantLike>(
  existingApplicant: T,
  newTextOrUpdates: string | ClassifiedApplicantUpdate[],
) {
  const sourceText = Array.isArray(newTextOrUpdates) ? "" : newTextOrUpdates;
  const suggestedUpdates = Array.isArray(newTextOrUpdates)
    ? newTextOrUpdates
    : classifyNewInfo(newTextOrUpdates, existingApplicant);

  const mergedBeforeDerived = suggestedUpdates.reduce(
    (current, update) => applySuggestedUpdate(current, update),
    { ...existingApplicant },
  );
  const mergedApplicant = recalculateApplicantDerivedFields(mergedBeforeDerived);

  const reviewRows: ApplicantMergeReviewRow[] = suggestedUpdates.map((update) => {
    const willApply = update.safeToApply && update.confidence === "High";
    const finalValue = willApply
      ? displayFieldValue(mergedApplicant, update.field)
      : displayFieldValue(existingApplicant, update.field);

    return {
      category: update.category,
      field: update.field,
      label: update.label,
      currentValue: update.oldValue || displayFieldValue(existingApplicant, update.field),
      newInfo: update.newValue || "No new value",
      finalValue,
      confidence: update.confidence,
      willApply,
      reason: update.reason,
    };
  });

  if (
    suggestedUpdates.some((update) => update.category === "Landlord Terms") &&
    !suggestedUpdates.some((update) => update.field === "monthlyIncome")
  ) {
    reviewRows.push({
      category: "Applicant Information",
      field: "monthlyIncome",
      label: "Monthly income",
      currentValue: formatMonthlyMoney(getSavedMonthlyIncome(existingApplicant)),
      newInfo: getSavedMonthlyIncome(existingApplicant)
        ? "No new income mentioned"
        : "No income mentioned",
      finalValue: getSavedMonthlyIncome(existingApplicant)
        ? `${formatMonthlyMoney(getSavedMonthlyIncome(existingApplicant))} preserved`
        : "Not provided",
      confidence: "High",
      willApply: false,
      reason: getSavedMonthlyIncome(existingApplicant)
        ? "No new income provided — saved income preserved."
        : "Income-to-rent ratio not calculated — applicant income not available.",
    });
  }

  const ratioChanged =
    finiteNumber(existingApplicant.incomeToRentRatio) !==
    finiteNumber(mergedApplicant.incomeToRentRatio);
  if (ratioChanged) {
    reviewRows.push({
      category: "Applicant Information",
      field: "incomeToRentRatio",
      label: "Income-to-rent ratio",
      currentValue: formatRatio(existingApplicant.incomeToRentRatio),
      newInfo: "Merged applicant values changed",
      finalValue: `${formatRatio(mergedApplicant.incomeToRentRatio)} after recalculation`,
      confidence: "High",
      willApply: true,
      reason: "Derived from final merged income and rent.",
    });
  }

  const updateLog = createApplicantUpdateHistory("", sourceText, reviewRows);

  return {
    existingApplicant,
    suggestedUpdates,
    mergedApplicant: {
      ...mergedApplicant,
      updateHistory: [
        ...((Array.isArray(existingApplicant.updateHistory)
          ? existingApplicant.updateHistory
          : []) as ApplicantUpdateHistoryEntry[]),
        updateLog,
      ],
    },
    reviewRows,
    updateLog,
  } satisfies ApplicantUpdateMergeResult<T>;
}

export function validateApplicantBeforeSave<T extends ApplicantLike>(applicant: T) {
  const income = positiveMoney(applicant.monthlyIncome, 1_000_000);
  if (finiteNumber(applicant.monthlyIncome) && income === null) {
    throw new Error("Applicant income is outside allowed limits.");
  }

  const rent = positiveMoney(applicant.monthlyRent, 100_000);
  if (finiteNumber(applicant.monthlyRent) && rent === null) {
    throw new Error("Monthly rent is outside allowed limits.");
  }

  return applicant;
}

export async function saveApplicantUpdate<T extends ApplicantLike>(
  applicantId: string,
  mergedApplicant: T,
) {
  const response = await fetch(`/api/applicants/${applicantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validateApplicantBeforeSave(mergedApplicant)),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || body?.error || "Could not save updates.");
  }

  return (await response.json()) as T;
}
