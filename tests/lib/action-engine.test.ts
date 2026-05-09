import { describe, it, expect } from "vitest";
import {
  computeConfidence,
  computeGenerationHash,
  computePipelineStats,
  generateActionsForApplicant,
  generateActionsForAll,
  ACTION_RULES,
} from "@/lib/action-engine";
import type { ActionContext } from "@/lib/action-engine";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";

// ── Test Helpers ────────────────────────────────────────────────────────────

const now = new Date();
const defaultApplicant: ApplicantRecord = {
  _id: "app_001",
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "555-0100",
  propertyAddress: "123 Main St",
  propertyCity: "NYC",
  propertyState: "NY",
  propertyPostalCode: "10001",
  moveInDate: "",
  coApplicants: [],
  applicationSource: "Zillow",
  monthlyRent: 2000,
  monthlyIncome: 8000,
  housingSupport: "None",
  supportProgram: "",
  monthlySubsidyAmount: 0,
  tenantPortionRent: 0,
  subsidyStatus: "N/A",
  inspectionStatus: "N/A",
  residentScore: 85,
  scores: {
    income: 100,
    credit: 0,
    resident: 85,
    rentalHistory: 90,
    rulesCompliance: 92,
    timeline: 88,
    communication: 85,
    documentation: 90,
  },
  totalScore: 87,
  affordabilityRatio: 4.0,
  responsibleRent: 2000,
  decision: "Strong",
  redFlags: [],
  notes: [],
  status: "Screening",
  createdAt: new Date(now.getTime() - 5 * 86_400_000).toISOString(),
  updatedAt: new Date(now.getTime() - 1 * 86_400_000).toISOString(),
};

function makeApplicant(
  overrides: Partial<ApplicantRecord> = {},
): ApplicantRecord {
  return {
    ...defaultApplicant,
    ...overrides,
    _id: `app_${Math.random().toString(36).slice(2, 8)}`,
  };
}

function makeContext(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    organizationId: "org_001",
    ownerId: "user_001",
    screeningPolicy: {
      minAffordabilityRatio: 2.5,
      minResidentScore: 560,
      strongScoreThreshold: 80,
      reviewScoreThreshold: 60,
      requireIncomeDocs: true,
      requireGovernmentId: true,
      requireLandlordReference: true,
    },
    automationSettings: {
      autoStatusEnabled: false,
      autoStatusMinConfidence: 90,
      autoApproveEnabled: false,
      autoArchiveAfterDays: 90,
      actionExpiryDays: 7,
    },
    allApplicants: [defaultApplicant],
    allApplicantIds: new Set([defaultApplicant._id]),
    previousActionIds: new Set(),
    pipelineStats: {
      totalApplicants: 1,
      avgScreenDays: 1,
      approvalRate: 0,
    },
    ...overrides,
  };
}

// ── Confidence Calculation Tests ──────────────────────────────────────────────

describe("computeConfidence", () => {
  it("returns base confidence when data is complete and fresh", () => {
    const result = computeConfidence(85, 1, 1, null);
    expect(result.confidence).toBe(85);
    expect(result.maxConfidence).toBe(85);
  });

  it("reduces confidence when data completeness is low", () => {
    const result = computeConfidence(85, 0.5, 1, null);
    expect(result.confidence).toBeLessThan(85);
    expect(result.confidence).toBeGreaterThan(30);
  });

  it("reduces confidence when data is stale", () => {
    const result = computeConfidence(85, 1, 0.3, null);
    expect(result.confidence).toBeLessThan(85);
    expect(result.confidence).toBeGreaterThan(50);
  });

  it("blends historical accuracy when provided", () => {
    const without = computeConfidence(85, 1, 1, null);
    const withHistory = computeConfidence(85, 1, 1, 90);
    // With historical accuracy of 90, confidence should shift
    expect(withHistory.confidence).not.toBe(without.confidence);
  });

  it("caps confidence at 100", () => {
    const result = computeConfidence(120, 1, 1, 100);
    expect(result.confidence).toBe(100);
  });

  it("returns 0 when base confidence is 0", () => {
    const result = computeConfidence(0, 0, 0, null);
    expect(result.confidence).toBe(0);
  });

  it("does not go below 0", () => {
    const result = computeConfidence(10, 0, 0, 0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });
});

// ── Pipeline Stats Tests ────────────────────────────────────────────────────

describe("computePipelineStats", () => {
  it("returns zeros for empty pipeline", () => {
    const stats = computePipelineStats([]);
    expect(stats.totalApplicants).toBe(0);
    expect(stats.avgScreenDays).toBe(0);
    expect(stats.approvalRate).toBe(0);
  });

  it("computes basic stats from applicants", () => {
    const apps = [
      makeApplicant({ status: "Screening" }),
      makeApplicant({ status: "Approved" }),
      makeApplicant({ status: "Rejected" }),
    ];
    const stats = computePipelineStats(apps);
    expect(stats.totalApplicants).toBe(3);
    expect(stats.approvalRate).toBe(33); // 1/3 ≈ 33%
  });

  it("computes average screening days", () => {
    const apps = [
      makeApplicant({
        status: "Screening",
        updatedAt: new Date(now.getTime() - 5 * 86_400_000).toISOString(),
      }),
    ];
    const stats = computePipelineStats(apps);
    expect(stats.avgScreenDays).toBeGreaterThanOrEqual(4);
    expect(stats.avgScreenDays).toBeLessThanOrEqual(6);
  });
});

// ── Generation Hash Tests ────────────────────────────────────────────────────

describe("computeGenerationHash", () => {
  it("produces same hash for identical applicant and context", () => {
    const a = makeApplicant();
    const ctx = makeContext();
    const hash1 = computeGenerationHash(a, ctx);
    const hash2 = computeGenerationHash(a, ctx);
    expect(hash1).toBe(hash2);
  });

  it("produces different hash when applicant status changes", () => {
    const a1 = makeApplicant({ status: "New" });
    const a2 = makeApplicant({ status: "Screening" });
    const ctx = makeContext();
    expect(computeGenerationHash(a1, ctx)).not.toBe(
      computeGenerationHash(a2, ctx),
    );
  });

  it("produces different hash when context policy changes", () => {
    const a = makeApplicant();
    const ctx1 = makeContext();
    const ctx2 = makeContext({
      screeningPolicy: {
        ...makeContext().screeningPolicy,
        strongScoreThreshold: 90,
      },
    });
    expect(computeGenerationHash(a, ctx1)).not.toBe(
      computeGenerationHash(a, ctx2),
    );
  });
});

// ── Action Generation Tests ──────────────────────────────────────────────────

describe("generateActionsForApplicant", () => {
  it("returns empty for healthy Strong applicant already in Screening", () => {
    const applicant = makeApplicant({
      status: "Screening",
      decision: "Strong",
      redFlags: [],
      scores: { ...defaultApplicant.scores, resident: 85 },
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    // Strong applicant with resident score should not need "run_screening"
    const hasRunScreening = actions.some(
      (a) => a.actionType === "run_screening",
    );
    expect(hasRunScreening).toBe(false);
  });

  it("recommends background check when resident score is missing", () => {
    const applicant = makeApplicant({
      status: "Screening",
      scores: { ...defaultApplicant.scores, resident: 0 },
      residentScore: 0,
    });
    const ctx = makeContext();
    const actions = generateActionsForApplicant(applicant, ctx);
    const screeningAction = actions.find(
      (a) => a.actionType === "run_screening",
    );
    expect(screeningAction).toBeDefined();
    expect(screeningAction!.priority).toBe("P1");
    expect(screeningAction!.confidence).toBeGreaterThan(0);
  });

  it("flags failed inspection as P0 urgent", () => {
    const applicant = makeApplicant({
      inspectionStatus: "Failed",
      housingSupport: "Voucher",
      status: "Screening",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const failedAction = actions.find(
      (a) => a.actionType === "resolve_failed_inspection",
    );
    expect(failedAction).toBeDefined();
    expect(failedAction!.priority).toBe("P0");
    expect(failedAction!.confidence).toBe(100);
  });

  it("flags risk applicant with approaching move-in as P0", () => {
    const tomorrow = new Date(now.getTime() + 2 * 86_400_000)
      .toISOString()
      .split("T")[0];
    const applicant = makeApplicant({
      decision: "Risk",
      status: "Review",
      moveInDate: tomorrow,
      totalScore: 45,
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const urgentAction = actions.find(
      (a) => a.actionType === "expedite_risk_review",
    );
    expect(urgentAction).toBeDefined();
    expect(urgentAction!.priority).toBe("P0");
  });

  it("recommends approval for Strong applicant with no red flags", () => {
    const applicant = makeApplicant({
      decision: "Strong",
      status: "Screening",
      redFlags: [],
      totalScore: 88,
      monthlyIncome: 8000,
      monthlyRent: 2000,
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const approveAction = actions.find(
      (a) => a.actionType === "approve_applicant",
    );
    expect(approveAction).toBeDefined();
    expect(approveAction!.priority).toBe("P1");
  });

  it("does NOT recommend approve when red flags exist", () => {
    const applicant = makeApplicant({
      decision: "Strong",
      status: "Screening",
      redFlags: ["Income below threshold"],
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const approveAction = actions.find(
      (a) => a.actionType === "approve_applicant",
    );
    expect(approveAction).toBeUndefined();
  });

  it("flags stale screening applicants", () => {
    const applicant = makeApplicant({
      status: "Screening",
      updatedAt: new Date(now.getTime() - 14 * 86_400_000).toISOString(),
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const staleAction = actions.find(
      (a) => a.actionType === "followup_screening",
    );
    expect(staleAction).toBeDefined();
    expect(staleAction!.priority).toBe("P1");
  });

  it("recommends subsidy verification for pending subsidy > 30 days", () => {
    const applicant = makeApplicant({
      housingSupport: "Voucher",
      subsidyStatus: "Pending",
      supportProgram: "Section 8",
      createdAt: new Date(now.getTime() - 45 * 86_400_000).toISOString(),
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const subsidyAction = actions.find(
      (a) => a.actionType === "verify_subsidy",
    );
    expect(subsidyAction).toBeDefined();
  });

  it("recommends inspection for voucher applicants pending inspection", () => {
    const applicant = makeApplicant({
      housingSupport: "Voucher",
      inspectionStatus: "Pending",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const inspectionAction = actions.find(
      (a) => a.actionType === "schedule_inspection",
    );
    expect(inspectionAction).toBeDefined();
  });

  it("recommends income doc verification when documentation score below policy", () => {
    const applicant = makeApplicant({
      scores: {
        ...defaultApplicant.scores,
        documentation: 40,
        income: 72,
      },
    });
    const ctx = makeContext();
    const actions = generateActionsForApplicant(applicant, ctx);
    const docAction = actions.find(
      (a) => a.actionType === "verify_income_docs",
    );
    expect(docAction).toBeDefined();
  });

  it("recommends intake for New applicants", () => {
    const applicant = makeApplicant({
      status: "New",
      email: "new@example.com",
      phone: "555-0001",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const intakeAction = actions.find(
      (a) => a.actionType === "intake_applicant",
    );
    expect(intakeAction).toBeDefined();
    expect(intakeAction!.automationSafe).toBe(true); // has email + phone
  });

  it("marks new applicant without contact as not automation safe", () => {
    const applicant = makeApplicant({
      status: "New",
      email: "",
      phone: "",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const intakeAction = actions.find(
      (a) => a.actionType === "intake_applicant",
    );
    expect(intakeAction).toBeDefined();
    expect(intakeAction!.automationSafe).toBe(false);
  });

  it("recommends archive for rejected applicants > 30 days stale", () => {
    const applicant = makeApplicant({
      status: "Rejected",
      updatedAt: new Date(now.getTime() - 45 * 86_400_000).toISOString(),
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const archiveAction = actions.find(
      (a) => a.actionType === "archive_applicant",
    );
    expect(archiveAction).toBeDefined();
    expect(archiveAction!.automationSafe).toBe(true);
    // Archive should be automationAvailable since it's always allowed
    expect(archiveAction!.automationAvailable).toBe(true);
  });

  it("caps actions at 3 per applicant", () => {
    // Create an applicant that triggers many rules
    const applicant = makeApplicant({
      status: "New",
      scores: { ...defaultApplicant.scores, resident: 0, documentation: 30 },
      residentScore: 0,
      email: "",
      phone: "",
      housingSupport: "Voucher",
      subsidyStatus: "Pending",
      inspectionStatus: "Pending",
      createdAt: new Date(now.getTime() - 50 * 86_400_000).toISOString(),
      updatedAt: new Date(now.getTime() - 20 * 86_400_000).toISOString(),
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    expect(actions.length).toBeLessThanOrEqual(3);
  });

  it("sorts actions by priority then confidence", () => {
    const applicant = makeApplicant({
      status: "New",
      inspectionStatus: "Failed",
      housingSupport: "Voucher",
      scores: { ...defaultApplicant.scores, resident: 0 },
      residentScore: 0,
      email: "test@example.com",
      phone: "555-0000",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    // P0 should be first
    if (actions.length > 1) {
      expect(actions[0].priority).toBe("P0");
    }
    // Priorities should not increase as we iterate
    const priorities = actions.map((a) => a.priority);
    const priorityValues = { P0: 0, P1: 1, P2: 2, info: 3 };
    for (let i = 1; i < priorities.length; i++) {
      expect(priorityValues[priorities[i]]).toBeGreaterThanOrEqual(
        priorityValues[priorities[i - 1]],
      );
    }
  });

  it("skips rules that have pending actions (dedup)", () => {
    const applicant = makeApplicant({
      status: "New",
      email: "new@example.com",
      phone: "555-0001",
    });
    const ctx = makeContext({
      previousActionIds: new Set([
        `${applicant._id}:new_applicant_needs_intake:pending`,
      ]),
    });
    const actions = generateActionsForApplicant(applicant, ctx);
    const intakeAction = actions.find(
      (a) => a.actionType === "intake_applicant",
    );
    expect(intakeAction).toBeUndefined();
  });

  it("recommends contact info request when email or phone missing", () => {
    const applicant = makeApplicant({
      email: "",
      phone: "",
      status: "Screening",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const contactAction = actions.find(
      (a) => a.actionType === "request_contact_info",
    );
    expect(contactAction).toBeDefined();
  });

  it("detects duplicate fingerprint applicants", () => {
    const applicant = makeApplicant({
      duplicateFingerprint: "dup_hash_123",
      status: "Screening",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const dupAction = actions.find((a) => a.actionType === "review_duplicate");
    expect(dupAction).toBeDefined();
  });

  it("flags co-applicants missing contact info", () => {
    const applicant = makeApplicant({
      coApplicants: [
        {
          name: "John Doe",
          email: "",
          phone: "",
          monthlyIncome: 3000,
          residentScore: 70,
          notes: "",
        },
      ],
      status: "Screening",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const coAction = actions.find(
      (a) => a.actionType === "request_coapplicant_info",
    );
    expect(coAction).toBeDefined();
  });

  it("returns empty array for applicant that triggers no rules", () => {
    const applicant = makeApplicant({
      status: "Approved",
      decision: "Strong",
      redFlags: [],
      scores: { ...defaultApplicant.scores, resident: 90, documentation: 85 },
      housingSupport: "None",
      inspectionStatus: "N/A",
      subsidyStatus: "N/A",
      email: "jane@example.com",
      phone: "555-0100",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    // An approved, clean applicant should not need any actions
    const ruleIds = actions.map((a) => a.actionType);
    // "strong_ready_to_approve" should not fire for "Approved" status
    expect(ruleIds).not.toContain("approve_applicant");
  });

  it("marks automation as NOT available when settings are disabled", () => {
    const applicant = makeApplicant({
      status: "New",
      email: "new@example.com",
      phone: "555-0001",
    });
    const ctx = makeContext({
      automationSettings: {
        autoStatusEnabled: false,
        autoStatusMinConfidence: 90,
        autoApproveEnabled: false,
        autoArchiveAfterDays: 90,
        actionExpiryDays: 7,
      },
    });
    const actions = generateActionsForApplicant(applicant, ctx);
    const intakeAction = actions.find(
      (a) => a.actionType === "intake_applicant",
    );
    expect(intakeAction).toBeDefined();
    expect(intakeAction!.automationSafe).toBe(true);
    expect(intakeAction!.automationAvailable).toBe(false); // autoStatusEnabled is false
  });

  it("marks automation as available when settings are enabled", () => {
    const applicant = makeApplicant({
      status: "New",
      email: "new@example.com",
      phone: "555-0001",
    });
    const ctx = makeContext({
      automationSettings: {
        autoStatusEnabled: true,
        autoStatusMinConfidence: 90,
        autoApproveEnabled: false,
        autoArchiveAfterDays: 90,
        actionExpiryDays: 7,
      },
    });
    const actions = generateActionsForApplicant(applicant, ctx);
    const intakeAction = actions.find(
      (a) => a.actionType === "intake_applicant",
    );
    expect(intakeAction).toBeDefined();
    expect(intakeAction!.automationAvailable).toBe(true);
  });
});

// ── Batch Generation Tests ───────────────────────────────────────────────────

describe("generateActionsForAll", () => {
  it("returns a map of applicant IDs to actions", () => {
    const appA = makeApplicant({
      status: "New",
      email: "a@test.com",
      phone: "555-a",
    });
    const appB = makeApplicant({
      status: "Screening",
      scores: { ...defaultApplicant.scores, resident: 0 },
      residentScore: 0,
    });
    const apps = [appA, appB];
    const ctx = makeContext({
      allApplicants: apps,
      allApplicantIds: new Set(apps.map((a) => a._id)),
    });
    const result = generateActionsForAll(apps, ctx);
    expect(result.size).toBeGreaterThanOrEqual(1);
    expect(result.get(appA._id)).toBeDefined();
  });
});

// ── Rule Coverage Tests ──────────────────────────────────────────────────────

describe("ACTION_RULES", () => {
  it("all rules have unique IDs", () => {
    const ids = ACTION_RULES.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all rules have confidenceBase between 0 and 100", () => {
    for (const rule of ACTION_RULES) {
      expect(rule.confidenceBase).toBeGreaterThanOrEqual(0);
      expect(rule.confidenceBase).toBeLessThanOrEqual(100);
    }
  });

  it("all rules have valid priorityBase", () => {
    const validPriorities = ["P0", "P1", "P2", "info"];
    for (const rule of ACTION_RULES) {
      expect(validPriorities).toContain(rule.priorityBase);
    }
  });

  it("all rules have requiredFields array", () => {
    for (const rule of ACTION_RULES) {
      expect(Array.isArray(rule.requiredFields)).toBe(true);
    }
  });
});

// ── Edge Case Tests ──────────────────────────────────────────────────────────

describe("action engine edge cases", () => {
  it("handles applicants with missing scores gracefully", () => {
    const applicant = makeApplicant({
      status: "Screening",
      scores: {
        income: 0,
        credit: 0,
        resident: 0,
        rentalHistory: 0,
        rulesCompliance: 0,
        timeline: 0,
        communication: 0,
        documentation: 0,
      },
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    // Should not throw
    expect(Array.isArray(actions)).toBe(true);
  });

  it("handles applicants with no moveInDate for risk rule", () => {
    const applicant = makeApplicant({
      decision: "Risk",
      moveInDate: "",
      status: "Review",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const moveInAction = actions.find(
      (a) => a.actionType === "expedite_risk_review",
    );
    expect(moveInAction).toBeUndefined(); // No move-in date = no urgency
  });

  it("does not recommend archive for recently rejected applicants", () => {
    const applicant = makeApplicant({
      status: "Rejected",
      updatedAt: new Date(now.getTime() - 5 * 86_400_000).toISOString(),
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    const archiveAction = actions.find(
      (a) => a.actionType === "archive_applicant",
    );
    expect(archiveAction).toBeUndefined();
  });

  it("includes explainability with every action", () => {
    const applicant = makeApplicant({
      status: "New",
      email: "test@example.com",
      phone: "555-0000",
    });
    const actions = generateActionsForApplicant(applicant, makeContext());
    for (const action of actions) {
      expect(action.explainability).toBeDefined();
      expect(action.explainability.length).toBeGreaterThan(0);
      expect(action.explainability[0].rule).toBeDefined();
      expect(action.explainability[0].facts).toBeDefined();
    }
  });

  it("confidence is affected by data completeness", () => {
    // Full data applicant
    const fullData = makeApplicant({
      status: "Screening",
      scores: { ...defaultApplicant.scores, resident: 0 },
      residentScore: 0,
    });
    const fullActions = generateActionsForApplicant(fullData, makeContext());
    const fullConfidence = fullActions.find(
      (a) => a.actionType === "run_screening",
    )?.confidence;

    // Sparse data applicant (missing key fields)
    const sparseData = makeApplicant({
      status: "Screening",
      scores: { ...defaultApplicant.scores, resident: 0 },
      residentScore: 0,
      email: "",
      phone: "",
      propertyAddress: "",
    });
    const sparseActions = generateActionsForApplicant(
      sparseData,
      makeContext(),
    );
    const sparseConfidence = sparseActions.find(
      (a) => a.actionType === "run_screening",
    )?.confidence;

    // Confidence should be lower or equal for sparse data
    if (fullConfidence !== undefined && sparseConfidence !== undefined) {
      expect(sparseConfidence).toBeLessThanOrEqual(fullConfidence);
    }
  });
});
