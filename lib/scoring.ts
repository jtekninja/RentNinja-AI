export type ApplicantScoringInput = {
  monthlyRent: number;
  monthlyIncome: number;
  creditScore: number;
  rentalHistoryScore: number;
  rulesComplianceScore: number;
  timelineScore: number;
  communicationScore: number;
  documentationScore: number;
};

export type ScoreBreakdown = {
  income: number;
  credit: number;
  rentalHistory: number;
  rulesCompliance: number;
  timeline: number;
  communication: number;
  documentation: number;
};

export type ScoreResult = {
  totalScore: number;
  affordabilityRatio: number;
  decision: "Strong" | "Review" | "Risk";
  redFlags: string[];
  scores: ScoreBreakdown;
};

export function calculateApplicantScore(input: ApplicantScoringInput): ScoreResult {
  const affordabilityRatio = input.monthlyRent > 0 ? input.monthlyIncome / input.monthlyRent : 0;

  const incomeScore =
    affordabilityRatio >= 3.5 ? 100 :
    affordabilityRatio >= 3 ? 88 :
    affordabilityRatio >= 2.5 ? 72 :
    affordabilityRatio >= 2 ? 55 :
    35;

  const creditScore =
    input.creditScore >= 760 ? 100 :
    input.creditScore >= 720 ? 90 :
    input.creditScore >= 680 ? 80 :
    input.creditScore >= 640 ? 68 :
    input.creditScore >= 600 ? 55 :
    35;

  const scores: ScoreBreakdown = {
    income: incomeScore,
    credit: creditScore,
    rentalHistory: input.rentalHistoryScore,
    rulesCompliance: input.rulesComplianceScore,
    timeline: input.timelineScore,
    communication: input.communicationScore,
    documentation: input.documentationScore
  };

  const totalScore = Math.round(
    Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.values(scores).length
  );

  const redFlags: string[] = [];

  if (affordabilityRatio < 2.5) redFlags.push("Income is below the preferred 2.5x rent threshold.");
  if (input.creditScore < 620) redFlags.push("Credit score is below 620.");
  if (input.rentalHistoryScore < 60) redFlags.push("Rental history score is weak.");
  if (input.rulesComplianceScore < 60) redFlags.push("Rules compliance score suggests elevated risk.");
  if (input.timelineScore < 60) redFlags.push("Timeline reliability is below target.");
  if (input.communicationScore < 60) redFlags.push("Communication score is below target.");
  if (input.documentationScore < 60) redFlags.push("Documentation completeness is below target.");

  const decision =
    totalScore >= 80 ? "Strong" :
    totalScore >= 60 ? "Review" :
    "Risk";

  return {
    totalScore,
    affordabilityRatio,
    decision,
    redFlags,
    scores
  };
}

