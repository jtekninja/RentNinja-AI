import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import { isUnsetNumber } from "@/lib/utils";

export interface LandlordReport {
  applicantName: string;
  generatedAt: string;
  summary: string;
  decision: { verdict: string; score: number; confidence: string };
  scores: { category: string; score: number; label: string }[];
  incomeStability: {
    ratio: number;
    level: string;
    monthlyIncome: number;
    monthlyRent: number;
  };
  redFlags: string[];
  strengths: string[];
  rationale: string[];
  nextSteps: string[];
}

function incomeLevel(ratio: number): string {
  if (ratio >= 4) return "Excellent";
  if (ratio >= 3) return "Good";
  if (ratio >= 2) return "Adequate";
  return "Risky";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Adequate";
  if (score > 0) return "Below Average";
  return "Not Provided";
}

export function generateLandlordReport(a: ApplicantRecord): LandlordReport {
  const aff = a.monthlyRent > 0 ? a.monthlyIncome / a.monthlyRent : 0;
  const level = incomeLevel(aff);
  const normalizedScreening = isUnsetNumber(a.scores.resident)
    ? 0
    : a.scores.resident;

  const scores = [
    {
      category: "Income",
      score: a.scores.income,
      label: scoreLabel(a.scores.income),
    },
    {
      category: "Screening",
      score: normalizedScreening,
      label: scoreLabel(normalizedScreening),
    },
    {
      category: "Rental History",
      score: a.scores.rentalHistory,
      label: scoreLabel(a.scores.rentalHistory),
    },
    {
      category: "Rules Compliance",
      score: a.scores.rulesCompliance,
      label: scoreLabel(a.scores.rulesCompliance),
    },
    {
      category: "Timeline",
      score: a.scores.timeline,
      label: scoreLabel(a.scores.timeline),
    },
    {
      category: "Communication",
      score: a.scores.communication,
      label: scoreLabel(a.scores.communication),
    },
    {
      category: "Documentation",
      score: a.scores.documentation,
      label: scoreLabel(a.scores.documentation),
    },
  ];

  const strengths = scores
    .filter((s) => s.score >= 80)
    .map((s) => `${s.category}: ${s.score}/100 (${s.label})`);
  if (aff >= 3)
    strengths.unshift(
      `Income stability: ${aff.toFixed(1)}x rent-to-income ratio`,
    );
  if (a.redFlags.length === 0) strengths.unshift("No red flags detected");
  if (a.coApplicants.length > 0)
    strengths.push(
      `Joint application with ${a.coApplicants.length} co-applicant(s)`,
    );

  const rationale = [
    `Total score: ${a.totalScore}/100 — ${a.decision}`,
    a.decision === "Strong"
      ? "All scoring categories meet or exceed thresholds."
      : a.decision === "Review"
        ? "One or more categories require manual review before approval."
        : "Multiple risk factors detected — review thoroughly before proceeding.",
  ];
  if (aff >= 3)
    rationale.push(
      `Income-to-rent ratio of ${aff.toFixed(1)}x exceeds the recommended 3.0x minimum.`,
    );
  if (a.redFlags.length > 0)
    rationale.push(
      `${a.redFlags.length} red flag(s) triggered: ${a.redFlags.join("; ")}.`,
    );

  const nextSteps =
    a.status === "Approved"
      ? [
          `Lease signing for ${a.name}`,
          `Move-in inspection scheduled for ${a.moveInDate || "TBD"}`,
          "Update property management system with tenant details",
        ]
      : a.status === "Screening"
        ? [
            a.scores.resident === 0
              ? "Complete screening/background check"
              : "Review screening results",
            `Confirm income: $${a.monthlyIncome.toLocaleString()}/mo vs rent: $${a.monthlyRent.toLocaleString()}/mo`,
            "Run AI review for additional insights if not already done",
          ]
        : a.decision === "Strong"
          ? [
              `Consider approving ${a.name}`,
              "Prepare lease documents",
              "Schedule move-in walkthrough",
            ]
          : [
              `Manual review required for ${a.name}`,
              "Request additional documentation if needed",
              "Consult screening policy thresholds in Admin settings",
            ];

  return {
    applicantName: a.name,
    generatedAt: new Date().toISOString(),
    summary: `${a.name} scored ${a.totalScore}/100 overall with a ${a.decision} recommendation. Household income of $${a.monthlyIncome.toLocaleString()}/mo covers the $${a.monthlyRent.toLocaleString()}/mo rent at ${aff.toFixed(1)}x. ${a.redFlags.length === 0 ? "No red flags detected." : `${a.redFlags.length} risk flag(s) identified.`}`,
    decision: {
      verdict: a.decision,
      score: a.totalScore,
      confidence:
        a.totalScore >= 80 ? "High" : a.totalScore >= 60 ? "Medium" : "Low",
    },
    scores,
    incomeStability: {
      ratio: aff,
      level,
      monthlyIncome: a.monthlyIncome,
      monthlyRent: a.monthlyRent,
    },
    redFlags: a.redFlags,
    strengths,
    rationale,
    nextSteps,
  };
}
