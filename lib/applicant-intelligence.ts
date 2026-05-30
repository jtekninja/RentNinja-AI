import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import { isUnsetNumber } from "@/lib/utils";

export type RiskLevel = "Low" | "Medium" | "High";
export type ConfidenceLevel = "Low" | "Medium" | "High";
export type ApplicantVerdict =
  | "Strong Candidate"
  | "Good Candidate"
  | "Manual Review"
  | "Missing Information"
  | "High Risk";
export type ReadinessLabel =
  | "Ready Now"
  | "Almost Ready"
  | "Needs Follow-Up"
  | "Not Ready";

export type ApplicantIntelligence = {
  score: number;
  riskLevel: RiskLevel;
  confidenceLevel: ConfidenceLevel;
  confidenceReason: string;
  verdict: ApplicantVerdict;
  readiness: number;
  readinessLabel: ReadinessLabel;
  documentsReceived: string[];
  documentsMissing: string[];
  verificationNeeded: string[];
  mainStrength: string;
  mainConcern: string;
  recommendedNextAction: string;
  followUpQuestions: string[];
  timeline: { label: string; detail: string; tone: "info" | "success" | "warning" }[];
};

const baseRequiredDocs = [
  "Photo ID",
  "Application form",
  "Pay stubs",
  "Bank statements",
  "W-2 or proof of income",
  "Landlord reference",
  "Employer verification",
];

function noteText(applicant: ApplicantRecord) {
  return applicant.notes.join("\n").toLowerCase();
}

function hasAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function inferDocuments(applicant: ApplicantRecord) {
  const text = noteText(applicant);
  const requiredDocs = [
    ...baseRequiredDocs,
    ...(applicant.housingSupport !== "None"
      ? ["Voucher/shopping letter", "Case worker contact"]
      : []),
  ];
  const received = requiredDocs.filter((doc) => {
    const key = doc.toLowerCase();
    if (key.includes("pay stub")) {
      return hasAny(text, ["pay stub", "paystub", "pay stubs"]);
    }
    if (key.includes("income") || key.includes("w-2")) {
      return hasAny(text, ["pay stub", "paystub", "income", "employment", "w2", "tax return"]);
    }
    if (key.includes("bank")) return hasAny(text, ["bank statement", "bank statements"]);
    if (key.includes("landlord")) return hasAny(text, ["landlord reference", "reference"]);
    if (key.includes("id")) return hasAny(text, ["government id", "photo id", "license"]);
    if (key.includes("application")) return hasAny(text, ["completed application", "application complete", "application form"]);
    if (key.includes("employer")) return hasAny(text, ["employer verification", "employment verification"]);
    if (key.includes("voucher")) return hasAny(text, ["voucher", "shopping letter"]);
    if (key.includes("case worker")) return hasAny(text, ["case worker", "caseworker"]);
    return false;
  });

  const missingFromNotes = requiredDocs.filter((doc) =>
    text.includes(doc.toLowerCase()) && hasAny(text, ["missing", "needed", "need"]),
  );
  const missing = Array.from(
    new Set([
      ...requiredDocs.filter((doc) => !received.includes(doc)),
      ...missingFromNotes,
    ]),
  );

  return { received, missing, required: requiredDocs };
}

function scoreBand(value: number, low: number, high: number) {
  if (value >= high) return 100;
  if (value <= low) return 35;
  return Math.round(35 + ((value - low) / (high - low)) * 65);
}

export function getApplicantIntelligence(applicant: ApplicantRecord): ApplicantIntelligence {
  const docs = inferDocuments(applicant);
  const affordability =
    !isUnsetNumber(applicant.affordabilityRatio) && Number.isFinite(applicant.affordabilityRatio)
      ? applicant.affordabilityRatio
      : 0;
  const incomeScore = scoreBand(affordability, 1.8, 3.2);
  const docScore = Math.round(((docs.required.length - docs.missing.length) / docs.required.length) * 100);
  const residentScore = !isUnsetNumber(applicant.scores.resident)
    ? applicant.scores.resident
    : applicant.residentScore > 0
      ? Math.min(100, Math.round((applicant.residentScore / 850) * 100))
      : 50;
  const moveInScore = applicant.moveInDate ? 90 : 45;
  const voucherClarity =
    applicant.housingSupport === "None"
      ? 90
      : applicant.subsidyStatus === "Verified" && applicant.tenantPortionRent > 0
        ? 90
        : 48;
  const communicationScore = isUnsetNumber(applicant.scores.communication)
    ? 55
    : applicant.scores.communication;
  const rentalHistoryScore = isUnsetNumber(applicant.scores.rentalHistory)
    ? 55
    : applicant.scores.rentalHistory;
  const policyFitScore = isUnsetNumber(applicant.scores.rulesCompliance)
    ? 60
    : applicant.scores.rulesCompliance;

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        incomeScore * 0.24 +
          docScore * 0.2 +
          rentalHistoryScore * 0.12 +
          residentScore * 0.12 +
          communicationScore * 0.1 +
          moveInScore * 0.08 +
          voucherClarity * 0.08 +
          policyFitScore * 0.06,
      ),
    ),
  );

  const readinessChecks = [
    docs.missing.length === 0,
    applicant.monthlyIncome > 0 && applicant.monthlyRent > 0,
    !isUnsetNumber(applicant.scores.resident) || applicant.residentScore > 0,
    docs.received.includes("Landlord reference"),
    Boolean(applicant.moveInDate),
    applicant.housingSupport === "None" || applicant.subsidyStatus === "Verified",
    Boolean(applicant.propertyAddress),
    applicant.notes.length > 0,
  ];
  const readiness = Math.round(
    (readinessChecks.filter(Boolean).length / readinessChecks.length) * 100,
  );

  const verificationNeeded = [
    applicant.housingSupport !== "None" && applicant.subsidyStatus !== "Verified"
      ? "Voucher/subsidy verification"
      : "",
    applicant.housingSupport !== "None" && applicant.inspectionStatus === "Pending"
      ? "Inspection status"
      : "",
    applicant.residentScore <= 0 && isUnsetNumber(applicant.scores.resident)
      ? "Screening score"
      : "",
  ].filter(Boolean);

  const riskLevel: RiskLevel =
    score >= 78 && docs.missing.length <= 1 && applicant.redFlags.length === 0
      ? "Low"
      : score < 58 || applicant.redFlags.length >= 2
        ? "High"
        : "Medium";
  const confidenceLevel: ConfidenceLevel =
    readiness >= 75 && docs.missing.length <= 2
      ? "High"
      : readiness >= 50
        ? "Medium"
        : "Low";
  const confidenceReason =
    confidenceLevel === "High"
      ? "Most core details and required documents are present."
      : confidenceLevel === "Medium"
        ? "Some key details are present, but missing items still need follow-up."
        : "Important applicant details or documents are missing, so the AI review should be treated as a draft.";
  const readinessLabel: ReadinessLabel =
    readiness >= 85
      ? "Ready Now"
      : readiness >= 70
        ? "Almost Ready"
        : readiness >= 45
          ? "Needs Follow-Up"
          : "Not Ready";
  const verdict: ApplicantVerdict =
    riskLevel === "High"
      ? "High Risk"
      : docs.missing.length >= 3 || confidenceLevel === "Low"
        ? "Missing Information"
        : score >= 82
          ? "Strong Candidate"
          : score >= 70
            ? "Good Candidate"
            : "Manual Review";

  const mainStrength =
    affordability >= 3
      ? `Strong affordability at ${affordability.toFixed(1)}x rent`
      : docs.missing.length <= 1
        ? "Application file is close to complete"
        : residentScore >= 75
          ? "Screening score is a positive signal"
          : "Core contact and application data are available";
  const mainConcern =
    docs.missing.length > 0
      ? `Missing ${docs.missing.slice(0, 2).join(", ")}`
      : riskLevel === "High"
        ? "Risk items need manual review"
        : applicant.housingSupport !== "None" && applicant.subsidyStatus !== "Verified"
          ? "Voucher/subsidy details need verification"
          : "No major concern from current objective inputs";
  const recommendedNextAction =
    verdict === "Strong Candidate" || readinessLabel === "Ready Now"
      ? "Prepare owner summary and review next lease steps."
      : docs.missing.length > 0
        ? "Send a missing-document request."
        : verdict === "Manual Review" || riskLevel === "High"
          ? "Review concerns and ask follow-up questions."
          : "Run an owner-ready comparison before deciding.";

  return {
    score,
    riskLevel,
    confidenceLevel,
    confidenceReason,
    verdict,
    readiness,
    readinessLabel,
    documentsReceived: docs.received,
    documentsMissing: docs.missing,
    verificationNeeded,
    mainStrength,
    mainConcern,
    recommendedNextAction,
    followUpQuestions: [
      docs.missing.length > 0 ? `Can you send ${docs.missing.slice(0, 2).join(" and ")}?` : "",
      !applicant.moveInDate ? "What move-in date are you targeting?" : "",
      applicant.housingSupport !== "None" && applicant.subsidyStatus !== "Verified"
        ? "Can you confirm voucher/subsidy paperwork and tenant portion?"
        : "",
    ].filter(Boolean),
    timeline: [
      { label: "Applicant created", detail: new Date(applicant.createdAt).toLocaleDateString(), tone: "info" },
      { label: "Ninja Decision Score calculated", detail: `${score}/100`, tone: score >= 75 ? "success" : "warning" },
      { label: "Readiness checked", detail: `${readiness}% ${readinessLabel}`, tone: readiness >= 70 ? "success" : "warning" },
    ],
  };
}

export function getWorkflowSuggestion(applicant: ApplicantRecord, intel = getApplicantIntelligence(applicant)) {
  if (applicant.status === "New") return "Ask screening questions and confirm the core details.";
  if (intel.documentsMissing.length > 0) return "Generate a missing-document request.";
  if (intel.verdict === "Strong Candidate") return "Prepare an owner summary.";
  if (intel.verdict === "Manual Review" || intel.riskLevel === "High") {
    return "List concerns and ask follow-up questions.";
  }
  if (applicant.status === "Approved") return "Generate an approved next-steps checklist.";
  if (applicant.status === "Rejected") return "Generate a polite decline message.";
  return intel.recommendedNextAction;
}
