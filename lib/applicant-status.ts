export const applicantStatusValues = [
  "New",
  "Pre-Screening",
  "Missing Documents",
  "Ready for Review",
  "Tour Scheduled",
  "Owner Review",
  "Strong Candidate",
  "Manual Review",
  "Approved",
  "Declined",
  "Leased",
  "Archived",
  "Screening",
  "Review",
  "Rejected",
] as const;

export type ApplicantStatus = (typeof applicantStatusValues)[number];

const statusByNormalizedText = new Map<string, ApplicantStatus>(
  applicantStatusValues.map((status) => [normalizeStatusText(status), status]),
);

const aiStatusAliases: Record<string, ApplicantStatus> = {
  [normalizeStatusText("Pre-screening")]: "Pre-Screening",
  [normalizeStatusText("Conditionally Approved")]: "Ready for Review",
  [normalizeStatusText("Conditionally approved pending documents")]: "Ready for Review",
  [normalizeStatusText("Pending Documents")]: "Missing Documents",
  [normalizeStatusText("Needs Documents")]: "Missing Documents",
  [normalizeStatusText("Needs Review")]: "Manual Review",
  [normalizeStatusText("Good Candidate")]: "Strong Candidate",
  [normalizeStatusText("Reject")]: "Rejected",
  [normalizeStatusText("Rejected")]: "Rejected",
  [normalizeStatusText("Approved Pending Verification")]: "Ready for Review",
};

function normalizeStatusText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function normalizeApplicantStatus(value: unknown): ApplicantStatus {
  const normalized = normalizeStatusText(String(value ?? ""));
  if (!normalized) return "New";

  if (aiStatusAliases[normalized]) return aiStatusAliases[normalized];
  if (statusByNormalizedText.has(normalized)) {
    return statusByNormalizedText.get(normalized) ?? "New";
  }
  if (normalized.includes("conditionally approved")) return "Ready for Review";
  if (normalized.includes("approved") && normalized.includes("verification")) {
    return "Ready for Review";
  }
  if (normalized.includes("pending document") || normalized.includes("needs document")) {
    return "Missing Documents";
  }
  if (normalized.includes("needs review")) return "Manual Review";
  if (normalized.includes("good candidate")) return "Strong Candidate";
  if (normalized === "reject") return "Rejected";

  return "New";
}
