import { calculateResponsibleRent, normalizeResidentScore } from "@/lib/scoring";
import { calculateIncomeToRentRatio } from "@/lib/income";

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

export function serializeApplicantRecord(applicant: Record<string, unknown>) {
  const scores = (applicant.scores ?? {}) as Record<string, unknown>;
  const normalizedNotes = normalizeNotes(applicant.notes);
  const normalizedCoApplicants = normalizeCoApplicants(applicant.coApplicants);
  const recoveredResidentScore = inferResidentScore(applicant.residentScore, normalizedNotes);
  const housingSupport = typeof applicant.housingSupport === "string" ? applicant.housingSupport : "None";
  const monthlyRent = finiteNumber(applicant.monthlyRent);
  const monthlyIncome = finiteNumber(applicant.monthlyIncome);
  const incomeAmount = nullableFiniteNumber(applicant.incomeAmount);
  const normalizedMonthlyIncome =
    nullableFiniteNumber(applicant.normalizedMonthlyIncome) ?? monthlyIncome;
  const storedIncomeToRentRatio = nullableFiniteNumber(applicant.incomeToRentRatio);
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
    nullableFiniteNumber(applicant.affordabilityRatio) ??
    storedIncomeToRentRatio ??
    calculateIncomeToRentRatio(normalizedMonthlyIncome || null, responsibleRent || monthlyRent || null) ??
    0;

  return {
    ...applicant,
    propertyAddress: typeof applicant.propertyAddress === "string" ? applicant.propertyAddress : "",
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
    incomeAmount,
    incomeFrequency: typeof applicant.incomeFrequency === "string" ? applicant.incomeFrequency : "unknown",
    normalizedMonthlyIncome,
    incomeToRentRatio: storedIncomeToRentRatio,
    monthlySubsidyAmount,
    tenantPortionRent,
    responsibleRent,
    affordabilityRatio,
    subsidyStatus: typeof applicant.subsidyStatus === "string" ? applicant.subsidyStatus : "N/A",
    inspectionStatus: typeof applicant.inspectionStatus === "string" ? applicant.inspectionStatus : "N/A",
    residentScore: recoveredResidentScore,
    notes: normalizedNotes,
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
