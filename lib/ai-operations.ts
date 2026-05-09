import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import { isUnsetNumber } from "@/lib/utils";

export type OperationType =
  | "action"
  | "bottleneck"
  | "urgent"
  | "automation"
  | "tip";
export type PriorityLevel = "P0" | "P1" | "P2" | "info";

export interface OperationItem {
  id: string;
  type: OperationType;
  priority: PriorityLevel;
  title: string;
  description: string;
  suggestedAction: string;
  confidence: number;
  maxConfidence: number;
  explainability: string[];
  automationSafe: boolean;
  automationAvailable: boolean;
  applicantId?: string;
  applicantName?: string;
  dismissible: boolean;
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

function op(
  id: string,
  overrides: Partial<OperationItem> &
    Pick<OperationItem, "title" | "description" | "suggestedAction">,
): OperationItem {
  return {
    id,
    type: "action",
    priority: "P2",
    confidence: 80,
    maxConfidence: 100,
    explainability: [],
    automationSafe: false,
    automationAvailable: false,
    dismissible: true,
    ...overrides,
  };
}

// 1. Next Action Recommender
export function recommendNextActions(
  applicants: ApplicantRecord[],
): OperationItem[] {
  const results: OperationItem[] = [];
  if (applicants.length === 0) {
    results.push(
      op("action-no-applicants", {
        type: "action",
        priority: "P2",
        title: "No applicants in pipeline",
        description: "Your workspace has zero applicants.",
        suggestedAction:
          "Create your first applicant from the New Application tab.",
        confidence: 100,
        explainability: ["Workspace applicant count is 0."],
      }),
    );
    return results;
  }
  const newApps = applicants.filter((a) => a.status === "New");
  if (newApps.length > 0) {
    results.push(
      op(`action-new-${newApps.length}`, {
        type: "action",
        priority: newApps.length >= 3 ? "P1" : "P2",
        title: `${newApps.length} new applicant${newApps.length > 1 ? "s" : ""} awaiting intake`,
        description: `${newApps.map((a) => a.name).join(", ")} ${newApps.length === 1 ? "has" : "have"} not been screened.`,
        suggestedAction:
          newApps.length === 1
            ? `Run AI intake on ${newApps[0].name}.`
            : "Run AI intake on these applicants.",
        confidence: newApps.every((a) => a.email && a.phone) ? 95 : 75,
        explainability: [`${newApps.length} applicant(s) with status "New".`],
        applicantId: newApps[0]?._id,
        applicantName: newApps[0]?.name,
      }),
    );
  }
  const stale = applicants.filter(
    (a) => a.status === "Screening" && daysSince(a.updatedAt) > 7,
  );
  if (stale.length > 0) {
    results.push(
      op("action-stale", {
        type: "action",
        priority: "P1",
        title: `${stale.length} applicant(s) stuck in screening`,
        description: stale
          .map((a) => `${a.name} (${daysSince(a.updatedAt)}d)`)
          .join(", "),
        suggestedAction: "Run AI review or update statuses.",
        confidence: 90,
        explainability: stale.map(
          (a) => `${a.name}: "Screening" for ${daysSince(a.updatedAt)} days.`,
        ),
        applicantId: stale[0]?._id,
        applicantName: stale[0]?.name,
      }),
    );
  }
  const strong = applicants.filter(
    (a) =>
      a.decision === "Strong" &&
      a.status !== "Approved" &&
      a.status !== "Rejected",
  );
  if (strong.length > 0) {
    results.push(
      op("action-strong", {
        type: "action",
        priority: strong.length === 1 ? "P1" : "P2",
        title:
          strong.length === 1
            ? `${strong[0].name} is ready to approve`
            : `${strong.length} applicants ready to approve`,
        description: strong
          .map(
            (a) =>
              `${a.name} (${a.totalScore}/100, ${a.affordabilityRatio.toFixed(1)}x)`,
          )
          .join(" • "),
        suggestedAction:
          strong.length > 3
            ? "Run AI comparison to find the best fit."
            : "Review and consider approving.",
        confidence: strong.every((a) => a.totalScore >= 80) ? 92 : 75,
        explainability: strong.map(
          (a) => `Score ${a.totalScore}/100 meets Strong threshold.`,
        ),
        applicantId: strong[0]?._id,
        applicantName: strong[0]?.name,
      }),
    );
  }
  const strongCount = applicants.filter((a) => a.decision === "Strong").length;
  if (strongCount > 3) {
    results.push(
      op("action-compare", {
        type: "action",
        priority: "P2",
        title: `Compare ${strongCount} Strong candidates`,
        description:
          "AI comparison ranks the best tenant when multiple strong candidates compete.",
        suggestedAction: "Run AI comparison.",
        confidence: 85,
        explainability: [`${strongCount} applicants scored as Strong.`],
      }),
    );
  }
  return results;
}

// 2. Bottleneck Detector
export function detectBottlenecks(
  applicants: ApplicantRecord[],
): OperationItem[] {
  const results: OperationItem[] = [];
  if (applicants.length === 0) return results;
  const screening = applicants.filter((a) => a.status === "Screening");
  if (screening.length >= 5) {
    const avg = Math.round(
      screening.reduce((s, a) => s + daysSince(a.updatedAt), 0) /
        screening.length,
    );
    results.push(
      op("bn-screening", {
        type: "bottleneck",
        priority: "P1",
        title: `${screening.length} applicants in screening backlog`,
        description: `Avg ${avg} days without update.`,
        suggestedAction: "Review all Screening applicants and update statuses.",
        confidence: 90,
        explainability: [
          `${screening.length} of ${applicants.length} total — avg ${avg} days.`,
        ],
      }),
    );
  }
  const inspections = applicants.filter(
    (a) => a.inspectionStatus === "Pending" && a.housingSupport !== "None",
  );
  if (inspections.length >= 3) {
    results.push(
      op("bn-inspections", {
        type: "bottleneck",
        priority: "P1",
        title: `${inspections.length} awaiting inspection`,
        description: "Subsidized applicants cannot proceed.",
        suggestedAction: "Schedule inspections.",
        confidence: 88,
        explainability: inspections.map(
          (a) => `${a.name}: inspection pending.`,
        ),
        applicantId: inspections[0]?._id,
        applicantName: inspections[0]?.name,
      }),
    );
  }
  const reviewRatio =
    applicants.filter((a) => a.decision === "Review").length /
    applicants.length;
  if (reviewRatio > 0.4) {
    results.push(
      op("bn-review", {
        type: "bottleneck",
        priority: "P2",
        title: `${Math.round(reviewRatio * 100)}% in Review`,
        description: "High review ratio may indicate threshold issues.",
        suggestedAction: "Review screening policy in Admin settings.",
        confidence: 75,
        explainability: [
          `Review ratio: ${Math.round(reviewRatio * 100)}%. Optimal: 20-30%.`,
        ],
      }),
    );
  }
  return results;
}

// 3. Urgent Issue Detector
export function detectUrgentIssues(
  applicants: ApplicantRecord[],
): OperationItem[] {
  const results: OperationItem[] = [];
  for (const a of applicants) {
    if (
      a.inspectionStatus === "Failed" &&
      a.status !== "Rejected" &&
      a.status !== "Review"
    ) {
      results.push(
        op(`urgent-fail-${a._id}`, {
          type: "urgent",
          priority: "P0",
          title: `Failed inspection — ${a.name}`,
          description: `Inspection failed. Stuck in "${a.status}" — ${daysSince(a.updatedAt)} days.`,
          suggestedAction: "Reschedule inspection or mark as Rejected.",
          confidence: 100,
          explainability: [
            "Inspection status is 'Failed'.",
            `Last updated ${daysSince(a.updatedAt)} days ago.`,
          ],
          applicantId: a._id,
          applicantName: a.name,
          dismissible: false,
        }),
      );
    }
    if (a.decision === "Risk" && a.moveInDate && a.status !== "Rejected") {
      const daysToMove = daysBetween(new Date(a.moveInDate), new Date());
      if (daysToMove >= 0 && daysToMove <= 7) {
        results.push(
          op(`urgent-risk-${a._id}`, {
            type: "urgent",
            priority: "P0",
            title: `Risk applicant with approaching move-in — ${a.name}`,
            description: `Risk (${a.totalScore}/100) — move-in in ${daysToMove} days.`,
            suggestedAction: "Expedite review or reject.",
            confidence: 100,
            explainability: [
              `Decision: Risk (${a.totalScore}/100).`,
              `Move-in: ${a.moveInDate} (${daysToMove}d).`,
            ],
            applicantId: a._id,
            applicantName: a.name,
            dismissible: false,
          }),
        );
      }
    }
    if (
      a.housingSupport !== "None" &&
      a.subsidyStatus === "Pending" &&
      daysSince(a.createdAt) > 30
    ) {
      results.push(
        op(`urgent-subsidy-${a._id}`, {
          type: "urgent",
          priority: "P1",
          title: `Unverified subsidy — ${a.name}`,
          description: `${a.supportProgram || "Subsidy"} pending ${daysSince(a.createdAt)} days.`,
          suggestedAction: "Verify subsidy or contact housing authority.",
          confidence: 85,
          explainability: [
            `Subsidy: "Pending" for ${daysSince(a.createdAt)} days.`,
          ],
          applicantId: a._id,
          applicantName: a.name,
        }),
      );
    }
  }
  return results;
}

// 4. Automation Opportunity Finder
export function findAutomationOpportunities(
  applicants: ApplicantRecord[],
): OperationItem[] {
  const results: OperationItem[] = [];
  const newWithData = applicants.filter(
    (a) => a.status === "New" && a.email && a.phone,
  );
  if (newWithData.length > 0) {
    results.push(
      op("auto-status", {
        type: "automation",
        priority: "P2",
        title: `${newWithData.length} applicants ready for auto-status`,
        description: "Enough data to auto-move to Screening.",
        suggestedAction: "Enable auto-status in Admin.",
        confidence: 80,
        explainability: newWithData.map((a) => `${a.name}: has email + phone.`),
        automationAvailable: false,
      }),
    );
  }
  const rejected = applicants.filter(
    (a) => a.status === "Rejected" && daysSince(a.updatedAt) > 30,
  );
  if (rejected.length > 0) {
    results.push(
      op("auto-archive", {
        type: "automation",
        priority: "info",
        title: `${rejected.length} rejected applicants eligible for archive`,
        description: "Rejected 30+ days ago with no activity.",
        suggestedAction: "Archive to clean up pipeline.",
        confidence: 90,
        explainability: rejected.map(
          (a) => `${a.name}: rejected ${daysSince(a.updatedAt)}d ago.`,
        ),
        automationAvailable: false,
      }),
    );
  }
  return results;
}

// 5. Repetitive Work Detector
export function detectRepetitiveWork(
  applicants: ApplicantRecord[],
): OperationItem[] {
  const results: OperationItem[] = [];
  if (applicants.length < 3) return results;
  const manual = applicants.filter(
    (a) => a.applicationSource === "Email / Manual" && a.status === "New",
  );
  if (manual.length >= 3) {
    results.push(
      op("tip-manual", {
        type: "tip",
        priority: "info",
        title: `${manual.length} manually entered applications`,
        description: "AI extraction auto-fills from uploaded documents.",
        suggestedAction:
          "Use the AI Intake Assistant on the New Application tab.",
        confidence: 100,
        explainability: [`${manual.length} from "Email / Manual" source.`],
      }),
    );
  }
  const joint = applicants.filter((a) => a.coApplicants.length > 0);
  const missingContact = joint.filter((a) =>
    a.coApplicants.some((c) => !c.email || !c.phone),
  );
  if (missingContact.length >= 3) {
    results.push(
      op("tip-co-contact", {
        type: "tip",
        priority: "info",
        title: `${missingContact.length} joint apps missing co-applicant contact`,
        description: "Missing email/phone creates communication gaps.",
        suggestedAction: "Request complete co-applicant contact details.",
        confidence: 90,
        explainability: [
          `${missingContact.length}/${joint.length} have incomplete data.`,
        ],
      }),
    );
  }
  return results;
}

// 6. Attention Prioritizer
function score(item: OperationItem, applicants: ApplicantRecord[]): number {
  const u: Record<PriorityLevel, number> = {
    P0: 100,
    P1: 70,
    P2: 40,
    info: 10,
  };
  let impact = 30;
  if (item.applicantId) {
    const a = applicants.find((ap) => ap._id === item.applicantId);
    if (a) {
      if (a.decision === "Strong") impact = 90;
      else if (a.decision === "Risk") impact = 60;
    }
  }
  const staleness = item.applicantId
    ? Math.min(
        daysSince(
          applicants.find((a) => a._id === item.applicantId)?.updatedAt ?? "",
        ),
        30,
      )
    : 0;
  return (
    0.4 * (u[item.priority] ?? 40) +
    0.3 * impact +
    0.2 * (staleness / 30) * 100 +
    0.1 * item.confidence
  );
}

// 7. Master Generator
export interface OperationsReport {
  urgent: OperationItem[];
  actions: OperationItem[];
  bottlenecks: OperationItem[];
  automation: OperationItem[];
  tips: OperationItem[];
  all: OperationItem[];
  isEmpty: boolean;
}

export function generateOperationsReport(
  applicants: ApplicantRecord[],
): OperationsReport {
  const urgent = detectUrgentIssues(applicants);
  const actions = recommendNextActions(applicants);
  const bottlenecks = detectBottlenecks(applicants);
  const automation = findAutomationOpportunities(applicants);
  const tips = detectRepetitiveWork(applicants);
  const all = [
    ...urgent,
    ...actions,
    ...bottlenecks,
    ...automation,
    ...tips,
  ].sort((a, b) => score(b, applicants) - score(a, applicants));
  return {
    urgent,
    actions,
    bottlenecks,
    automation,
    tips,
    all,
    isEmpty: all.length === 0,
  };
}
