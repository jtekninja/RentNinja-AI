import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import { isUnsetNumber } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ExplainabilityItem {
  rule: string;
  facts: Record<string, unknown>;
  policyThreshold?: unknown;
}

export interface ActionSuggestion {
  actionType: string;
  title: string;
  description: string;
  suggestedAction: string;
  priority: "P0" | "P1" | "P2" | "info";
  confidence: number;
  maxConfidence: number;
  explainability: ExplainabilityItem[];
  automationSafe: boolean;
  automationAvailable: boolean;
}

export interface ActionContext {
  organizationId: string;
  ownerId: string;
  screeningPolicy: {
    minAffordabilityRatio: number;
    minResidentScore: number;
    strongScoreThreshold: number;
    reviewScoreThreshold: number;
    requireIncomeDocs: boolean;
    requireGovernmentId: boolean;
    requireLandlordReference: boolean;
  };
  automationSettings: {
    autoStatusEnabled: boolean;
    autoStatusMinConfidence: number;
    autoApproveEnabled: boolean;
    autoArchiveAfterDays: number;
    actionExpiryDays: number;
  };
  allApplicants: ApplicantRecord[];
  allApplicantIds: Set<string>;
  previousActionIds: Set<string>;
  pipelineStats: {
    totalApplicants: number;
    avgScreenDays: number;
    approvalRate: number;
  };
}

export interface ActionRule {
  id: string;
  condition: (applicant: ApplicantRecord, ctx: ActionContext) => boolean;
  generate: (
    applicant: ApplicantRecord,
    ctx: ActionContext,
  ) => Omit<
    ActionSuggestion,
    "confidence" | "maxConfidence" | "automationAvailable"
  >;
  priorityBase: "P0" | "P1" | "P2" | "info";
  confidenceBase: number;
  requiredFields: (keyof ApplicantRecord)[];
  automationSafe: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

function moveInDays(a: ApplicantRecord): number {
  if (!a.moveInDate) return Infinity;
  const d = new Date(a.moveInDate);
  if (isNaN(d.getTime())) return Infinity;
  return daysBetween(d, new Date());
}

function fieldIsSet(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !isUnsetNumber(value);
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function computeDataCompleteness(
  applicant: ApplicantRecord,
  requiredFields: (keyof ApplicantRecord)[],
): number {
  if (requiredFields.length === 0) return 1;
  const filled = requiredFields.filter((f) => fieldIsSet(applicant[f])).length;
  return filled / requiredFields.length;
}

function computeDataFreshness(applicant: ApplicantRecord): number {
  const days = daysSince(applicant.updatedAt);
  if (days <= 1) return 1;
  if (days <= 7) return 0.9;
  if (days <= 30) return 0.7;
  if (days <= 90) return 0.5;
  return 0.3;
}

export function computeConfidence(
  baseConfidence: number,
  dataCompleteness: number,
  dataFreshness: number,
  historicalAccuracy: number | null,
): { confidence: number; maxConfidence: number } {
  const rawConfidence =
    baseConfidence * dataCompleteness * (0.7 + 0.3 * dataFreshness);

  let confidence = rawConfidence;
  if (historicalAccuracy !== null) {
    confidence = rawConfidence * 0.8 + historicalAccuracy * 20;
  }

  const rounded = Math.round(Math.min(confidence, 100));

  return {
    confidence: rounded,
    maxConfidence: baseConfidence,
  };
}

function hashApplicantState(applicant: ApplicantRecord): string {
  // Simple deterministic hash of the fields that matter for actions
  const key = [
    applicant.status,
    applicant.decision,
    applicant.scores?.resident ?? 0,
    applicant.scores?.income ?? 0,
    applicant.scores?.documentation ?? 0,
    applicant.scores?.rentalHistory ?? 0,
    applicant.scores?.rulesCompliance ?? 0,
    applicant.scores?.timeline ?? 0,
    applicant.scores?.communication ?? 0,
    applicant.inspectionStatus,
    applicant.subsidyStatus,
    applicant.housingSupport,
    applicant.redFlags?.length ?? 0,
    applicant.email ? 1 : 0,
    applicant.phone ? 1 : 0,
    applicant.moveInDate ?? "",
    applicant.monthlyIncome,
    applicant.monthlyRent,
    applicant.residentScore,
    applicant.updatedAt,
  ].join("|");
  return key;
}

function hashContext(ctx: ActionContext): string {
  return [
    ctx.pipelineStats.totalApplicants,
    ctx.screeningPolicy.strongScoreThreshold,
    ctx.screeningPolicy.reviewScoreThreshold,
    ctx.screeningPolicy.minAffordabilityRatio,
    ctx.automationSettings.autoStatusEnabled,
    ctx.automationSettings.autoStatusMinConfidence,
    ctx.automationSettings.actionExpiryDays,
    ctx.automationSettings.autoArchiveAfterDays,
  ].join("|");
}

export function computeGenerationHash(
  applicant: ApplicantRecord,
  ctx: ActionContext,
): string {
  return `${hashApplicantState(applicant)}__${hashContext(ctx)}`;
}

// ── Rule Definitions ─────────────────────────────────────────────────────────

function rule(overrides: {
  id: string;
  condition: (a: ApplicantRecord, ctx: ActionContext) => boolean;
  generate: (
    a: ApplicantRecord,
    ctx: ActionContext,
  ) => Omit<
    ActionSuggestion,
    "confidence" | "maxConfidence" | "automationAvailable"
  >;
  priorityBase?: ActionRule["priorityBase"];
  confidenceBase?: number;
  requiredFields?: (keyof ApplicantRecord)[];
  automationSafe?: boolean;
}): ActionRule {
  return {
    priorityBase: "P2",
    confidenceBase: 85,
    requiredFields: [],
    automationSafe: false,
    ...overrides,
  };
}

export const ACTION_RULES: ActionRule[] = [
  // ── P0: Urgent Issues ────────────────────────────────────────────────────
  rule({
    id: "failed_inspection_stuck",
    condition: (a) =>
      a.inspectionStatus === "Failed" &&
      a.status !== "Rejected" &&
      a.status !== "Review",
    priorityBase: "P0",
    confidenceBase: 100,
    requiredFields: ["inspectionStatus", "status", "updatedAt"],
    generate: (a) => ({
      actionType: "resolve_failed_inspection",
      title: `Failed inspection — ${a.name}`,
      description: `Inspection failed. Applicant is stuck in "${a.status}" status for ${daysSince(a.updatedAt)} days.`,
      suggestedAction: "Reschedule inspection or mark as Rejected.",
      priority: "P0",
      explainability: [
        {
          rule: "failed_inspection_stuck",
          facts: {
            inspectionStatus: a.inspectionStatus,
            status: a.status,
            daysSinceUpdate: daysSince(a.updatedAt),
          },
        },
      ],
      automationSafe: false,
    }),
  }),

  rule({
    id: "risk_approaching_movein",
    condition: (a) => {
      if (a.decision !== "Risk") return false;
      if (a.status === "Rejected") return false;
      const days = moveInDays(a);
      return days >= 0 && days <= 7;
    },
    priorityBase: "P0",
    confidenceBase: 100,
    requiredFields: ["decision", "moveInDate", "status", "totalScore"],
    generate: (a) => ({
      actionType: "expedite_risk_review",
      title: `Risk applicant with approaching move-in — ${a.name}`,
      description: `Risk (${a.totalScore}/100) — move-in in ${moveInDays(a)} days.`,
      suggestedAction: "Expedite review or reject before move-in date.",
      priority: "P0",
      explainability: [
        {
          rule: "risk_approaching_movein",
          facts: {
            decision: a.decision,
            totalScore: a.totalScore,
            moveInDate: a.moveInDate,
            daysToMoveIn: moveInDays(a),
          },
        },
      ],
      automationSafe: false,
    }),
  }),

  // ── P1: High-Priority Actions ────────────────────────────────────────────
  rule({
    id: "resident_score_missing",
    condition: (a) =>
      (a.scores?.resident === undefined ||
        a.scores.resident === 0 ||
        isUnsetNumber(a.scores.resident)) &&
      a.status !== "New",
    priorityBase: "P1",
    confidenceBase: 85,
    requiredFields: ["scores", "status", "residentScore"],
    generate: (a, ctx) => ({
      actionType: "run_screening",
      title: "Run background check",
      description:
        "Resident/screening score is missing. A screening report is required before making an approval decision.",
      suggestedAction: `Run background check for ${a.name}.`,
      priority: "P1",
      explainability: [
        {
          rule: "resident_score_missing",
          facts: {
            residentScore: a.residentScore,
            scoresResident: a.scores?.resident ?? 0,
            status: a.status,
          },
          policyThreshold: {
            minResidentScore: ctx.screeningPolicy.minResidentScore,
          },
        },
      ],
      automationSafe: false,
    }),
  }),

  rule({
    id: "screening_stale",
    condition: (a) => a.status === "Screening" && daysSince(a.updatedAt) > 7,
    priorityBase: "P1",
    confidenceBase: 88,
    requiredFields: ["status", "updatedAt"],
    generate: (a, ctx) => ({
      actionType: "followup_screening",
      title: `${a.name} stuck in screening — ${daysSince(a.updatedAt)} days`,
      description: `No update in ${daysSince(a.updatedAt)} days. Average pipeline screening time is ${ctx.pipelineStats.avgScreenDays.toFixed(1)} days.`,
      suggestedAction: "Follow up or update applicant status.",
      priority: "P1",
      explainability: [
        {
          rule: "screening_stale",
          facts: {
            status: a.status,
            daysSinceUpdate: daysSince(a.updatedAt),
            updatedAt: a.updatedAt,
          },
          policyThreshold: {
            pipelineAvgScreenDays: ctx.pipelineStats.avgScreenDays,
          },
        },
      ],
      automationSafe: false,
    }),
  }),

  rule({
    id: "strong_ready_to_approve",
    condition: (a) =>
      a.decision === "Strong" &&
      a.status !== "Approved" &&
      a.status !== "Rejected" &&
      a.redFlags.length === 0,
    priorityBase: "P1",
    confidenceBase: 90,
    requiredFields: [
      "decision",
      "status",
      "redFlags",
      "totalScore",
      "monthlyIncome",
      "monthlyRent",
    ],
    generate: (a) => {
      const aff =
        a.monthlyRent > 0
          ? (a.monthlyIncome / a.monthlyRent).toFixed(1)
          : "N/A";
      return {
        actionType: "approve_applicant",
        title: `${a.name} is ready to approve`,
        description: `Strong recommendation (${a.totalScore}/100) with no red flags. Income covers rent at ${aff}x.`,
        suggestedAction: `Review ${a.name}'s application and approve.`,
        priority: "P1",
        explainability: [
          {
            rule: "strong_ready_to_approve",
            facts: {
              decision: a.decision,
              totalScore: a.totalScore,
              redFlagsCount: a.redFlags.length,
              affordabilityRatio: a.affordabilityRatio,
            },
          },
        ],
        automationSafe: false,
      };
    },
  }),

  rule({
    id: "subsidy_unverified",
    condition: (a) =>
      a.housingSupport !== "None" &&
      a.subsidyStatus === "Pending" &&
      daysSince(a.createdAt) > 30,
    priorityBase: "P1",
    confidenceBase: 75,
    requiredFields: [
      "housingSupport",
      "subsidyStatus",
      "supportProgram",
      "createdAt",
    ],
    generate: (a) => ({
      actionType: "verify_subsidy",
      title: `Unverified subsidy — ${a.name}`,
      description: `${a.supportProgram || "Subsidy"} status is pending for ${daysSince(a.createdAt)} days.`,
      suggestedAction: "Verify subsidy or contact housing authority.",
      priority: "P1",
      explainability: [
        {
          rule: "subsidy_unverified",
          facts: {
            housingSupport: a.housingSupport,
            subsidyStatus: a.subsidyStatus,
            supportProgram: a.supportProgram,
            daysPending: daysSince(a.createdAt),
          },
        },
      ],
      automationSafe: false,
    }),
  }),

  rule({
    id: "inspection_pending",
    condition: (a) =>
      a.inspectionStatus === "Pending" && a.housingSupport !== "None",
    priorityBase: "P1",
    confidenceBase: 82,
    requiredFields: ["inspectionStatus", "housingSupport"],
    generate: (a) => ({
      actionType: "schedule_inspection",
      title: `Inspection needed — ${a.name}`,
      description: `Subsidized/voucher applicant requires a passed inspection before proceeding. Currently: ${a.inspectionStatus}.`,
      suggestedAction: "Schedule property inspection.",
      priority: "P1",
      explainability: [
        {
          rule: "inspection_pending",
          facts: {
            inspectionStatus: a.inspectionStatus,
            housingSupport: a.housingSupport,
          },
        },
      ],
      automationSafe: false,
    }),
  }),

  // ── P2: Standard Actions ─────────────────────────────────────────────────
  rule({
    id: "new_applicant_needs_intake",
    condition: (a) => a.status === "New",
    priorityBase: "P2",
    confidenceBase: 80,
    requiredFields: ["status", "email", "phone"],
    generate: (a) => ({
      actionType: "intake_applicant",
      title: `New applicant — ${a.name}`,
      description:
        a.email && a.phone
          ? "Applicant has contact info. Ready for screening intake."
          : "Applicant is missing contact information.",
      suggestedAction:
        a.email && a.phone
          ? "Move to Screening and begin background check."
          : "Request missing contact info from applicant.",
      priority: "P2",
      explainability: [
        {
          rule: "new_applicant_needs_intake",
          facts: {
            status: a.status,
            hasEmail: Boolean(a.email),
            hasPhone: Boolean(a.phone),
          },
        },
      ],
      automationSafe: Boolean(a.email && a.phone),
    }),
  }),

  rule({
    id: "income_docs_below_policy",
    condition: (a, ctx) =>
      ctx.screeningPolicy.requireIncomeDocs &&
      a.scores?.documentation !== undefined &&
      a.scores.documentation > 0 &&
      a.scores.documentation < 70,
    priorityBase: "P2",
    confidenceBase: 78,
    requiredFields: ["scores", "monthlyIncome", "monthlyRent"],
    generate: (a, ctx) => ({
      actionType: "verify_income_docs",
      title: "Verify income documentation",
      description: `Documentation score is ${a.scores.documentation}/100 — below the ${ctx.screeningPolicy.requireIncomeDocs ? "required" : "recommended"} threshold of 70.`,
      suggestedAction: "Request pay stubs, bank statements, or tax returns.",
      priority: "P2",
      explainability: [
        {
          rule: "income_docs_below_policy",
          facts: {
            documentationScore: a.scores.documentation,
            incomeScore: a.scores.income,
            monthlyIncome: a.monthlyIncome,
            monthlyRent: a.monthlyRent,
          },
          policyThreshold: {
            requiredDocsThreshold: 70,
          },
        },
      ],
      automationSafe: false,
    }),
  }),

  rule({
    id: "duplicate_detected",
    condition: (a) => Boolean(a.duplicateFingerprint),
    priorityBase: "P2",
    confidenceBase: 92,
    requiredFields: ["name", "email"],
    generate: (a) => ({
      actionType: "review_duplicate",
      title: "Possible duplicate application",
      description: `${a.name} may have a duplicate application in the system.`,
      suggestedAction:
        "Review duplicate applications and keep the most complete one.",
      priority: "P2",
      explainability: [
        {
          rule: "duplicate_detected",
          facts: {
            name: a.name,
            email: a.email,
            hasFingerprint: Boolean(a.duplicateFingerprint),
          },
        },
      ],
      automationSafe: false,
    }),
  }),

  rule({
    id: "missing_contact_info",
    condition: (a) => !a.email || !a.phone,
    priorityBase: "P2",
    confidenceBase: 70,
    requiredFields: ["email", "phone"],
    generate: (a) => ({
      actionType: "request_contact_info",
      title: "Request contact information",
      description: `${a.name} is missing ${!a.email && !a.phone ? "email and phone" : !a.email ? "email" : "phone"}.`,
      suggestedAction: `Request ${!a.email && !a.phone ? "email and phone number" : !a.email ? "email address" : "phone number"} from applicant.`,
      priority: "P2",
      explainability: [
        {
          rule: "missing_contact_info",
          facts: {
            hasEmail: Boolean(a.email),
            hasPhone: Boolean(a.phone),
          },
        },
      ],
      automationSafe: false,
    }),
  }),

  // ── P2 / info: Automation Opportunities ──────────────────────────────────
  rule({
    id: "auto_archive_eligible",
    condition: (a) => a.status === "Rejected" && daysSince(a.updatedAt) > 30,
    priorityBase: "info",
    confidenceBase: 95,
    requiredFields: ["status", "updatedAt"],
    automationSafe: true,
    generate: (a) => ({
      actionType: "archive_applicant",
      title: `Archive rejected applicant — ${a.name}`,
      description: `Rejected ${daysSince(a.updatedAt)} days ago with no activity. Eligible for archival.`,
      suggestedAction: "Archive this applicant to clean up your pipeline.",
      priority: "info",
      explainability: [
        {
          rule: "auto_archive_eligible",
          facts: {
            status: a.status,
            daysSinceUpdate: daysSince(a.updatedAt),
          },
        },
      ],
      automationSafe: true,
    }),
  }),

  rule({
    id: "coapplicant_missing_contact",
    condition: (a) =>
      a.coApplicants.length > 0 &&
      a.coApplicants.some((c) => !c.email || !c.phone),
    priorityBase: "info",
    confidenceBase: 85,
    requiredFields: ["coApplicants"],
    generate: (a) => {
      const missing = a.coApplicants.filter((c) => !c.email || !c.phone);
      return {
        actionType: "request_coapplicant_info",
        title: `${missing.length} co-applicant(s) missing contact info`,
        description: `${a.name} has ${missing.length} co-applicant(s) without full contact details. This creates communication gaps.`,
        suggestedAction: "Request complete contact info for all co-applicants.",
        priority: "info",
        explainability: [
          {
            rule: "coapplicant_missing_contact",
            facts: {
              totalCoApplicants: a.coApplicants.length,
              missingCount: missing.length,
              missingNames: missing.map((c) => c.name),
            },
          },
        ],
        automationSafe: false,
      };
    },
  }),
];

// ── Action Generator ─────────────────────────────────────────────────────────

export function generateActionsForApplicant(
  applicant: ApplicantRecord,
  ctx: ActionContext,
  historicalAccuracyMap?: Record<string, number>,
): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];

  for (const rule of ACTION_RULES) {
    // Skip if this action is already pending for this applicant
    const dedupKey = `${applicant._id}:${rule.id}:pending`;
    if (ctx.previousActionIds.has(dedupKey)) continue;

    // Check condition
    if (!rule.condition(applicant, ctx)) continue;

    // Generate base suggestion
    const base = rule.generate(applicant, ctx);

    // Compute confidence
    const completeness = computeDataCompleteness(
      applicant,
      rule.requiredFields,
    );
    const freshness = computeDataFreshness(applicant);
    const historicalAcc = historicalAccuracyMap?.[rule.id] ?? null;

    const { confidence, maxConfidence } = computeConfidence(
      rule.confidenceBase,
      completeness,
      freshness,
      historicalAcc,
    );

    // Determine if automation is actually available (must be safe AND enabled)
    // Use the generated automationSafe value, which may be dynamic per-applicant
    const automationAvailable =
      base.automationSafe &&
      (rule.id === "auto_archive_eligible"
        ? true // archive is always available for auto
        : ctx.automationSettings.autoStatusEnabled);

    suggestions.push({
      ...base,
      confidence,
      maxConfidence,
      automationAvailable,
    });
  }

  // Sort by priority (P0 > P1 > P2 > info) then by confidence descending
  const priorityOrder = { P0: 0, P1: 1, P2: 2, info: 3 };
  suggestions.sort(
    (a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      b.confidence - a.confidence,
  );

  // Cap at 3 per applicant to prevent fatigue
  return suggestions.slice(0, 3);
}

export function generateActionsForAll(
  applicants: ApplicantRecord[],
  ctx: ActionContext,
  historicalAccuracyMap?: Record<string, number>,
): Map<string, ActionSuggestion[]> {
  const results = new Map<string, ActionSuggestion[]>();

  for (const applicant of applicants) {
    const actions = generateActionsForApplicant(
      applicant,
      ctx,
      historicalAccuracyMap,
    );
    if (actions.length > 0) {
      results.set(applicant._id, actions);
    }
  }

  return results;
}

export function computePipelineStats(
  applicants: ApplicantRecord[],
): ActionContext["pipelineStats"] {
  if (applicants.length === 0) {
    return { totalApplicants: 0, avgScreenDays: 0, approvalRate: 0 };
  }

  const screeningApps = applicants.filter((a) => a.status === "Screening");
  const avgScreenDays =
    screeningApps.length > 0
      ? screeningApps.reduce((sum, a) => sum + daysSince(a.updatedAt), 0) /
        screeningApps.length
      : 0;

  const approved = applicants.filter((a) => a.status === "Approved").length;

  return {
    totalApplicants: applicants.length,
    avgScreenDays: Math.round(avgScreenDays * 10) / 10,
    approvalRate:
      applicants.length > 0
        ? Math.round((approved / applicants.length) * 100)
        : 0,
  };
}
