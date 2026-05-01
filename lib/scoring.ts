export type ApplicantScoringInput = {
  monthlyRent: number;
  monthlyIncome: number;
  housingSupport: "None" | "Voucher" | "Subsidy";
  supportProgram?: string;
  monthlySubsidyAmount: number;
  tenantPortionRent: number;
  subsidyStatus: "N/A" | "Pending" | "Verified";
  inspectionStatus: "N/A" | "Pending" | "Passed" | "Failed";
  creditScore?: number;
  residentScore: number;
  coApplicants?: Array<{
    residentScore?: number;
  }>;
  rentalHistoryScore: number;
  rulesComplianceScore: number;
  timelineScore: number;
  communicationScore: number;
  documentationScore: number;
};

export type ScreeningPolicy = {
  minAffordabilityRatio: number;
  minResidentScore: number;
  strongScoreThreshold: number;
  reviewScoreThreshold: number;
  requireIncomeDocs: boolean;
  requireGovernmentId: boolean;
  requireLandlordReference: boolean;
};

export type ScoreBreakdown = {
  income: number;
  credit: number;
  resident: number;
  rentalHistory: number;
  rulesCompliance: number;
  timeline: number;
  communication: number;
  documentation: number;
};

export const scoreWeights = {
  income: 0.18,
  credit: 0,
  resident: 0.4,
  rentalHistory: 0.14,
  rulesCompliance: 0.1,
  timeline: 0.06,
  communication: 0.05,
  documentation: 0.07
} as const;

export const defaultScreeningPolicy: ScreeningPolicy = {
  minAffordabilityRatio: 2.5,
  minResidentScore: 560,
  strongScoreThreshold: 80,
  reviewScoreThreshold: 60,
  requireIncomeDocs: true,
  requireGovernmentId: true,
  requireLandlordReference: true
};

export type ScoreResult = {
  totalScore: number;
  affordabilityRatio: number;
  responsibleRent: number;
  decision: "Strong" | "Review" | "Risk";
  redFlags: string[];
  scores: ScoreBreakdown;
};

export function normalizeResidentScore(residentScore: number) {
  if (residentScore <= 0) {
    return 0;
  }

  if (residentScore > 100) {
    const bounded = Math.min(850, Math.max(350, residentScore));
    return Math.round(((bounded - 350) / 500) * 100);
  }

  return Math.min(100, Math.max(0, residentScore));
}

function getHouseholdResidentScores(input: ApplicantScoringInput) {
  const scores = [input.residentScore, ...(input.coApplicants ?? []).map((item) => Number(item.residentScore ?? 0))]
    .filter((value) => Number.isFinite(value) && value > 0);

  return scores;
}

export function calculateResponsibleRent(input: Pick<ApplicantScoringInput, "monthlyRent" | "housingSupport" | "monthlySubsidyAmount" | "tenantPortionRent">) {
  if (input.housingSupport === "None") {
    return input.monthlyRent;
  }

  if (input.tenantPortionRent > 0) {
    return input.tenantPortionRent;
  }

  if (input.monthlySubsidyAmount > 0) {
    return Math.max(input.monthlyRent - input.monthlySubsidyAmount, 0);
  }

  return input.monthlyRent;
}

function resolveScreeningPolicy(policy?: Partial<ScreeningPolicy>): ScreeningPolicy {
  return {
    ...defaultScreeningPolicy,
    ...policy
  };
}

function hasProvidedScore(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function calculateApplicantScore(input: ApplicantScoringInput, policy?: Partial<ScreeningPolicy>): ScoreResult {
  const resolvedPolicy = resolveScreeningPolicy(policy);
  const responsibleRent = calculateResponsibleRent(input);
  const affordabilityRatio = responsibleRent > 0 ? input.monthlyIncome / responsibleRent : 0;
  const householdResidentScores = getHouseholdResidentScores(input);
  const normalizedResidentScores = householdResidentScores.map((value) => normalizeResidentScore(value));
  const normalizedResidentScore =
    normalizedResidentScores.length > 0
      ? Math.round(normalizedResidentScores.reduce((sum, value) => sum + value, 0) / normalizedResidentScores.length)
      : 0;
  const lowestResidentScore = householdResidentScores.length > 0 ? Math.min(...householdResidentScores) : 0;

  const incomeScore =
    affordabilityRatio >= 3.5 ? 100 :
    affordabilityRatio >= 3 ? 88 :
    affordabilityRatio >= resolvedPolicy.minAffordabilityRatio ? 72 :
    affordabilityRatio >= 2 ? 55 :
    35;

  const scores: ScoreBreakdown = {
    income: incomeScore,
    credit: 0,
    resident: normalizedResidentScore,
    rentalHistory: input.rentalHistoryScore,
    rulesCompliance: input.rulesComplianceScore,
    timeline: input.timelineScore,
    communication: input.communicationScore,
    documentation: input.documentationScore
  };

  const providedWeights = {
    income: scoreWeights.income,
    credit: hasProvidedScore(scores.credit) ? scoreWeights.credit : 0,
    resident: householdResidentScores.length > 0 ? scoreWeights.resident : 0,
    rentalHistory: hasProvidedScore(input.rentalHistoryScore) ? scoreWeights.rentalHistory : 0,
    rulesCompliance: hasProvidedScore(input.rulesComplianceScore) ? scoreWeights.rulesCompliance : 0,
    timeline: hasProvidedScore(input.timelineScore) ? scoreWeights.timeline : 0,
    communication: hasProvidedScore(input.communicationScore) ? scoreWeights.communication : 0,
    documentation: hasProvidedScore(input.documentationScore) ? scoreWeights.documentation : 0
  } as const;

  const activeWeightTotal = (Object.values(providedWeights) as number[]).reduce((sum, weight) => sum + weight, 0);

  const totalScore = activeWeightTotal > 0
    ? Math.round(
        ((scores.income * providedWeights.income) +
          (scores.credit * providedWeights.credit) +
          (scores.resident * providedWeights.resident) +
          (scores.rentalHistory * providedWeights.rentalHistory) +
          (scores.rulesCompliance * providedWeights.rulesCompliance) +
          (scores.timeline * providedWeights.timeline) +
          (scores.communication * providedWeights.communication) +
          (scores.documentation * providedWeights.documentation)) /
          activeWeightTotal
      )
    : 0;

  const redFlags: string[] = [];

  if (affordabilityRatio < resolvedPolicy.minAffordabilityRatio) {
    redFlags.push(
      input.housingSupport === "None"
        ? `Income is below the preferred ${resolvedPolicy.minAffordabilityRatio.toFixed(1)}x rent threshold.`
        : "Income appears low relative to the tenant-paid rent share."
    );
  }
  if (lowestResidentScore > 100) {
    if (lowestResidentScore < resolvedPolicy.minResidentScore) {
      redFlags.push(`ResidentScore is in a higher-risk range below ${resolvedPolicy.minResidentScore}.`);
    }
  } else if (lowestResidentScore > 0 && lowestResidentScore < Math.min(resolvedPolicy.minResidentScore, 100)) {
    redFlags.push(`Resident or screening score is below ${Math.min(resolvedPolicy.minResidentScore, 100)}.`);
  }
  if (hasProvidedScore(input.rentalHistoryScore) && input.rentalHistoryScore < 60) redFlags.push("Rental history score is weak.");
  if (hasProvidedScore(input.rulesComplianceScore) && input.rulesComplianceScore < 60) redFlags.push("Rules compliance score suggests elevated risk.");
  if (hasProvidedScore(input.timelineScore) && input.timelineScore < 60) redFlags.push("Timeline reliability is below target.");
  if (hasProvidedScore(input.communicationScore) && input.communicationScore < 60) redFlags.push("Communication score is below target.");
  if (hasProvidedScore(input.documentationScore) && input.documentationScore < 60) redFlags.push("Documentation completeness is below target.");
  if (resolvedPolicy.requireIncomeDocs && hasProvidedScore(input.documentationScore) && input.documentationScore < 70) {
    redFlags.push("Income documentation is required but not yet strong enough in the file.");
  }
  if (resolvedPolicy.requireGovernmentId && hasProvidedScore(input.documentationScore) && input.documentationScore < 70) {
    redFlags.push("Government ID verification is required but not yet confirmed.");
  }
  if (resolvedPolicy.requireLandlordReference && hasProvidedScore(input.rentalHistoryScore) && input.rentalHistoryScore < 70) {
    redFlags.push("Landlord reference is required but rental history support is still weak.");
  }
  if (input.housingSupport !== "None" && input.tenantPortionRent <= 0 && input.monthlySubsidyAmount <= 0) {
    redFlags.push("Tenant-paid rent share is not confirmed yet.");
  }
  if (input.housingSupport !== "None" && input.subsidyStatus === "Pending") {
    redFlags.push("Voucher or subsidy verification is still pending.");
  }
  if (input.housingSupport !== "None" && input.inspectionStatus === "Failed") {
    redFlags.push("Required program inspection failed.");
  }

  const decision =
    totalScore >= resolvedPolicy.strongScoreThreshold ? "Strong" :
    totalScore >= resolvedPolicy.reviewScoreThreshold ? "Review" :
    "Risk";

  return {
    totalScore,
    affordabilityRatio,
    responsibleRent,
    decision,
    redFlags,
    scores
  };
}
