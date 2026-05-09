# Green Flag Intelligence — Positive Signal Design Delta

## The Problem

The current system surfaces **13 red flag detectors** (scoring engine), **33 risk signals** (risk intelligence), and **8 negative NBA rules** — but has no equivalent mechanism for surfacing **positive signals** that justify an approval decision.

When a landlord evaluates an applicant, they need both:

- ⚠ "Here's what's wrong" (red flags — currently strong)
- ✅ "Here's why this applicant is good" (green flags — currently missing)

The three signals — **verified income**, **strong payment history**, **stable employment** — are the landlord's core approval criteria. The system should proactively surface them, just as it proactively surfaces red flags.

## Current State

| What exists                                                         | What's missing                                                                          |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 13 red flag detectors in `lib/scoring.ts`                           | Zero positive signal detectors                                                          |
| Risk dimensions (fraud, payment, lease, docs)                       | "Strength" dimensions (income verifiability, payment reliability, employment stability) |
| NBA rules for problems ("followup_screening", "verify_income_docs") | NBA rules for confidence ("income_confirmed", "low_risk_approve")                       |
| Red flag display in applicant cards                                 | Green flag display in applicant cards                                                   |
| AI review has "strengths" field (from OpenAI)                       | No deterministic strength detection                                                     |

## Green Flag Signal Definitions

### Signal 1: Verified Income

```typescript
interface VerifiedIncomeSignal {
  signalId: "income-verified";
  confidence: number; // 0–100
  sources: string[]; // What data confirms this
  details: {
    affordabilityRatio: number;
    incomeDocumented: boolean;
    incomeSourceKnown: boolean;
    incomeStabilityScore: number; // 0–100
    coApplicantIncomeConfirmed: boolean;
  };
}
```

**Deterministic checks:**
| Condition | Points | Confidence |
|---|---|---|
| `affordabilityRatio >= 3.5` | +30 | High |
| `affordabilityRatio >= 3.0` | +20 | High |
| `monthlyIncome > 0` AND `scores.income >= 80` | +25 | High |
| `scores.documentation >= 70` | +20 | Medium |
| `applicationSource !== "Email / Manual"` | +15 | Medium |
| Co-applicants all have `monthlyIncome > 0` | +10 | Medium |

**Output:** `confidence >= 70` → emit "verified income" green flag

### Signal 2: Strong Payment History

```typescript
interface PaymentHistorySignal {
  signalId: "payment-history-strong";
  confidence: number;
  sources: string[];
  details: {
    tenantRiskScore: number; // Inverted — lower is better
    onTimePaymentRate: number; // % on-time
    latePaymentCount: number;
    leaseViolations: number;
    priorApprovals: number; // Number of times previously approved
  };
}
```

**Deterministic checks:**
| Condition | Points | Confidence |
|---|---|---|
| TenantMemory exists with `onTimePaymentRate >= 95%` | +40 | High |
| TenantMemory exists with 0 lease violations | +25 | High |
| TenantMemory exists with 0 late payments in last 12mo | +20 | High |
| `scores.rentalHistory >= 80` | +25 | Medium |
| `scores.rulesCompliance >= 80` | +15 | Medium |
| Tenant was previously approved (any property) | +10 | Medium |

**Output:** `confidence >= 60` → emit "strong payment history" green flag

### Signal 3: Stable Employment

```typescript
interface EmploymentStabilitySignal {
  signalId: "employment-stable";
  confidence: number;
  sources: string[];
  details: {
    incomeConsistencyScore: number;
    documentationStrength: number;
    applicationSourceReliability: string;
    incomeVsRentBuffer: number; // How much buffer above min ratio
  };
}
```

**Deterministic checks:**
| Condition | Points | Confidence |
|---|---|---|
| `scores.income >= 85` AND `scores.documentation >= 70` | +35 | High |
| `affordabilityRatio >= 3.5` (significant buffer) | +25 | High |
| `applicationSource !== "Email / Manual"` (API-verified source) | +20 | Medium |
| `scores.income >= 80` | +15 | Medium |
| Co-applicants have income scores >= 70 | +10 | Low |
| `housingSupport === "Voucher"` AND `subsidyStatus === "Verified"` | +15 | Medium |

**Output:** `confidence >= 65` → emit "stable employment" green flag

## Implementation: Green Flag Detector

```typescript
// lib/green-flags.ts — New file

import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import type { TenantMemoryEntry } from "@/lib/memory-types";
import type { ScoreResult } from "@/lib/scoring";

export interface GreenFlag {
  signalId: string;
  label: string;
  confidence: number;
  severity: "strong" | "moderate" | "supporting";
  description: string;
  details: Record<string, unknown>;
}

export function detectGreenFlags(
  applicant: ApplicantRecord,
  tenantMemory?: TenantMemoryEntry | null,
): GreenFlag[] {
  const flags: GreenFlag[] = [];
  const income = detectVerifiedIncome(applicant);
  if (income) flags.push(income);

  const payment = detectStrongPaymentHistory(applicant, tenantMemory);
  if (payment) flags.push(payment);

  const employment = detectStableEmployment(applicant);
  if (employment) flags.push(employment);

  return flags;
}

function detectVerifiedIncome(applicant: ApplicantRecord): GreenFlag | null {
  let score = 0;

  if (applicant.affordabilityRatio >= 3.5) score += 30;
  else if (applicant.affordabilityRatio >= 3.0) score += 20;

  if (applicant.monthlyIncome > 0 && applicant.scores.income >= 80) score += 25;
  if (applicant.scores.documentation >= 70) score += 20;
  if (
    applicant.applicationSource &&
    applicant.applicationSource !== "Email / Manual"
  )
    score += 15;

  const coAppsHaveIncome = applicant.coApplicants.every(
    (c) => c.monthlyIncome > 0,
  );
  if (coAppsHaveIncome && applicant.coApplicants.length > 0) score += 10;

  if (score < 70) return null;

  return {
    signalId: "income-verified",
    label: "Verified income",
    confidence: Math.min(score, 100),
    severity: score >= 85 ? "strong" : score >= 70 ? "moderate" : "supporting",
    description:
      score >= 85
        ? `Income of ${formatCurrency(applicant.monthlyIncome)} covers rent at ${applicant.affordabilityRatio.toFixed(1)}x — well above the ${applicant.scores.documentation >= 70 ? "with documentation confirmed" : "minimum threshold"}.`
        : `Income is documented at ${formatCurrency(applicant.monthlyIncome)} with affordability of ${applicant.affordabilityRatio.toFixed(1)}x.`,
    details: {
      affordabilityRatio: applicant.affordabilityRatio,
      monthlyIncome: applicant.monthlyIncome,
      documentationScore: applicant.scores.documentation,
      incomeScore: applicant.scores.income,
      coApplicantsConfirmed: coAppsHaveIncome,
    },
  };
}

function detectStrongPaymentHistory(
  applicant: ApplicantRecord,
  tenantMemory?: TenantMemoryEntry | null,
): GreenFlag | null {
  let score = 0;

  // Tenant memory data (highest confidence)
  if (tenantMemory?.leaseHistory?.length > 0) {
    const latestLease =
      tenantMemory.leaseHistory[tenantMemory.leaseHistory.length - 1];
    const totalPayments =
      latestLease.paymentHistory.onTime + latestLease.paymentHistory.late;
    const onTimeRate =
      totalPayments > 0 ? latestLease.paymentHistory.onTime / totalPayments : 0;

    if (onTimeRate >= 0.95) score += 40;
    if (latestLease.leaseViolations === 0) score += 25;
    if (latestLease.paymentHistory.late === 0) score += 20;
  }

  // Score-based signals (medium confidence)
  if (applicant.scores.rentalHistory >= 80) score += 25;
  if (applicant.scores.rulesCompliance >= 80) score += 15;

  // Prior approval
  if (tenantMemory?.pastApplications?.some((a) => a.status === "Approved")) {
    score += 10;
  }

  if (score < 60) return null;

  return {
    signalId: "payment-history-strong",
    label: "Strong payment history",
    confidence: Math.min(score, 100),
    severity: score >= 80 ? "strong" : "moderate",
    description:
      tenantMemory?.leaseHistory?.length > 0
        ? `Returning applicant with ${tenantMemory.leaseHistory.length} prior lease(s) — on-time payment rate verified.`
        : `Rental history score of ${applicant.scores.rentalHistory}/100 with ${applicant.scores.rulesCompliance}/100 compliance.`,
    details: {
      rentalHistoryScore: applicant.scores.rentalHistory,
      rulesComplianceScore: applicant.scores.rulesCompliance,
      priorLeases: tenantMemory?.leaseHistory?.length ?? 0,
      priorApprovals:
        tenantMemory?.pastApplications?.filter((a) => a.status === "Approved")
          .length ?? 0,
    },
  };
}

function detectStableEmployment(applicant: ApplicantRecord): GreenFlag | null {
  let score = 0;

  if (applicant.scores.income >= 85 && applicant.scores.documentation >= 70)
    score += 35;
  if (applicant.affordabilityRatio >= 3.5) score += 25;
  if (
    applicant.applicationSource &&
    applicant.applicationSource !== "Email / Manual"
  )
    score += 20;
  if (applicant.scores.income >= 80) score += 15;
  if (
    applicant.coApplicants.every((c) => c.monthlyIncome >= 3000) &&
    applicant.coApplicants.length > 0
  )
    score += 10;
  if (
    applicant.housingSupport === "Voucher" &&
    applicant.subsidyStatus === "Verified"
  )
    score += 15;

  if (score < 65) return null;

  return {
    signalId: "employment-stable",
    label: "Stable employment",
    confidence: Math.min(score, 100),
    severity: score >= 80 ? "strong" : "moderate",
    description:
      score >= 80
        ? `Income of ${formatCurrency(applicant.monthlyIncome)} is ${applicant.affordabilityRatio.toFixed(1)}x rent — well-documented and stable.`
        : `Income of ${formatCurrency(applicant.monthlyIncome)} supports rent at ${applicant.affordabilityRatio.toFixed(1)}x.`,
    details: {
      incomeScore: applicant.scores.income,
      documentationScore: applicant.scores.documentation,
      affordabilityRatio: applicant.affordabilityRatio,
      applicationSource: applicant.applicationSource,
    },
  };
}
```

## NBA Rules for Green Flags

The NBA engine should get positive action rules alongside negative ones:

```typescript
// Proposed new NBA rules in lib/action-engine.ts

rule({
  id: "income_verified_approve",
  condition: (a) => hasGreenFlag(a, "income-verified") && hasGreenFlag(a, "employment-stable") && hasGreenFlag(a, "payment-history-strong"),
  priorityBase: "P1",
  confidenceBase: 95,
  requiredFields: ["scores", "monthlyIncome", "affordabilityRatio"],
  generate: (a) => ({
    actionType: "fast_track_approval",
    title: `All 3 green flags — ${a.name}`,
    description: `Income verified (${a.affordabilityRatio.toFixed(1)}x), employment stable (income ${a.scores.income}/100), documentation strong (${a.scores.documentation}/100). Eligible for fast-track approval.`,
    suggestedAction: "Approve this applicant — all positive signals confirmed.",
    priority: "P1",
    explainability: [{
      rule: "income_verified_approve",
      facts: {
        affordabilityRatio: a.affordabilityRatio,
        incomeScore: a.scores.income,
        documentationScore: a.scores.documentation,
        greenFlags: getActiveGreenFlags(a).map(f => f.signalId),
      },
    }],
    automationSafe: true,
  }),
}),

rule({
  id: "green_flags_override_risks",
  condition: (a) => {
    const greenCount = getActiveGreenFlags(a).length;
    return greenCount >= 2 && a.decision === "Review" && a.redFlags.length <= 2;
  },
  priorityBase: "P1",
  confidenceBase: 80,
  requiredFields: [],
  generate: (a) => ({
    actionType: "reconsider_risk_level",
    title: `Multiple green flags offset Review status — ${a.name}`,
    description: `Applicant has ${getActiveGreenFlags(a).length} positive signals despite Review status (${a.redFlags.length} red flags). Consider re-evaluating.`,
    suggestedAction: "Review applicant — positive signals may outweigh indicated risk.",
    priority: "P1",
    explainability: [{
      rule: "green_flags_override_risks",
      facts: {
        decision: a.decision,
        greenFlagCount: getActiveGreenFlags(a).length,
        redFlagCount: a.redFlags.length,
        greenFlags: getActiveGreenFlags(a).map(f => f.signalId),
      },
    }],
    automationSafe: false,
  }),
}),
```

## UI Integration: Green Flag Badges

Green flags render alongside red flags in the applicant card, with matching visual weight:

```
┌────────────────────────────────────────────┐
│  Jane Doe  72/100  [Review]  [Screening]  │
│                                            │
│  ✅ Strong signals (3):                    │
│    • Verified income — 4.0x affordability │
│    • Strong payment history (returning)    │
│    • Stable employment (income 85/100)     │
│                                            │
│  ⚠ Red flags (2):                          │
│    • Income docs below threshold           │
│    • Screening score pending               │
│                                            │
│  Net assessment: Moderate — 3 green, 2 red │
│  [Approve]  [Request docs]  [Skip]         │
└────────────────────────────────────────────┘
```

### Green Flag Badge Component

```typescript
// components/dashboard/green-flag-badge.tsx

interface GreenFlagBadgeProps {
  flag: GreenFlag;
}

export function GreenFlagBadge({ flag }: GreenFlagBadgeProps) {
  const colors = {
    strong: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    moderate: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    supporting: "border-slate-400/20 bg-slate-400/8 text-slate-300",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 text-xs ${colors[flag.severity]}`}>
      <div className="flex items-center gap-2">
        <span className="text-emerald-300">✓</span>
        <span className="font-semibold">{flag.label}</span>
        <span className="opacity-60">{flag.confidence}% confident</span>
      </div>
      <p className="mt-1 text-xs opacity-80">{flag.description}</p>
    </div>
  );
}
```

## AI Review Enhancement

The existing AI review (`GET /api/ai/applicants/[id]/analysis`) already has a `strengths` field. The green flag system can pre-populate it with deterministic data before AI enhancement:

```typescript
// In the AI review route, before calling OpenAI:
const greenFlags = detectGreenFlags(applicant, tenantMemory);

// Inject green flag summaries into the AI prompt context:
{
  role: "user",
  content: JSON.stringify({
    applicant: { ...applicantData },
    positiveSignals: greenFlags.map(f => ({
      signal: f.label,
      confidence: f.confidence,
      evidence: f.description,
    })),
    instructions: "Highlight these positive signals in your analysis. If all three (verified income, strong payment history, stable employment) are present, recommend approval with high confidence.",
  }),
}
```

## Green Flag Calculation in Scoring Engine

The existing `calculateApplicantScore()` in `lib/scoring.ts` can be extended to include positive scoring:

```typescript
// Add to ScoreResult
export type ScoreResult = {
  totalScore: number;
  affordabilityRatio: number;
  responsibleRent: number;
  decision: "Strong" | "Review" | "Risk";
  redFlags: string[];
  scores: ScoreBreakdown;
  greenFlags: GreenFlag[]; // NEW — positive signals
};
```

This allows the `totalScore` to already reflect positive signals, but more importantly, the green flags are surfaced explicitly so the landlord can see **why** the score is high, not just the score itself.

## Integration with Operational Inbox

The operational inbox's `recommendNextActions()` should check for fast-track opportunities:

```typescript
// In lib/ai-operations.ts, recommendNextActions():
const fastTrackCandidates = applicants.filter((a) => {
  const greens = detectGreenFlags(a);
  return greens.length >= 3 && a.status !== "Approved";
});

if (fastTrackCandidates.length > 0) {
  results.push(
    op(`green-flag-${fastTrackCandidates.length}`, {
      type: "action",
      priority: fastTrackCandidates.length === 1 ? "P1" : "P2",
      title:
        fastTrackCandidates.length === 1
          ? `${fastTrackCandidates[0].name} is ready for fast-track approval`
          : `${fastTrackCandidates.length} applicants ready for fast-track approval`,
      description:
        "All 3 positive signals confirmed: verified income, strong payment history, stable employment.",
      suggestedAction:
        fastTrackCandidates.length === 1
          ? `Approve ${fastTrackCandidates[0].name} — all green flags present.`
          : "Review and approve qualified candidates.",
      confidence: 95,
      explainability: fastTrackCandidates.map(
        (a) =>
          `${a.name}: income ${a.affordabilityRatio.toFixed(1)}x, income score ${a.scores.income}/100, docs ${a.scores.documentation}/100`,
      ),
      applicantId: fastTrackCandidates[0]?._id,
      applicantName: fastTrackCandidates[0]?.name,
    }),
  );
}
```

## Net Assessment Display

Inspired by the cognitive load audit's finding #4 (repetitive workflows), the condensed applicant card should show a **net assessment** that visualizes green vs red flags at a glance:

```typescript
function getNetAssessment(
  applicant: ApplicantRecord,
  greenFlags: GreenFlag[],
): {
  status: "approve" | "review" | "caution";
  summary: string;
} {
  const greenCount = greenFlags.length;
  const redCount = applicant.redFlags.length;

  if (greenCount >= 3 && redCount === 0) {
    return { status: "approve", summary: "✅ All clear — approve" };
  }
  if (greenCount >= 2 && redCount <= 1) {
    return { status: "approve", summary: "✅ Mostly positive — approve" };
  }
  if (greenCount >= redCount) {
    return {
      status: "review",
      summary: `🔍 ${greenCount} green, ${redCount} red — review`,
    };
  }
  return {
    status: "caution",
    summary: `⚠ ${redCount} red flags outweigh ${greenCount} green — caution`,
  };
}
```

## Decision Matrix

The landlord sees a unified decision matrix combining green and red flags:

| Green Flags      | Red Flags | Net Recommendation          | Action                              |
| ---------------- | --------- | --------------------------- | ----------------------------------- |
| 3 (all verified) | 0         | **Strong approve**          | Fast-track approval                 |
| 2–3              | 1         | **Approve**                 | Standard approval                   |
| 2                | 2         | **Review but lean approve** | Conditional approval with follow-up |
| 0–1              | 0         | **Standard review**         | Manual review needed                |
| 0–1              | 1–2       | **Caution**                 | Review with scrutiny                |
| 0–1              | 3+        | **Decline**                 | Recommend rejection                 |

## Files Affected

| File                                           | Change                                                                        |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `lib/green-flags.ts`                           | **New** — `detectGreenFlags()`, `getActiveGreenFlags()`, `getNetAssessment()` |
| `lib/scoring.ts`                               | Extend `ScoreResult` to include `greenFlags: GreenFlag[]`                     |
| `lib/action-engine.ts`                         | Add 2 new NBA rules: `fast_track_approval`, `reconsider_risk_level`           |
| `lib/ai-operations.ts`                         | Add fast-track detection to `recommendNextActions()`                          |
| `components/dashboard/green-flag-badge.tsx`    | **New** — Visual green flag badge with severity coloring                      |
| `components/dashboard/applicant-list.tsx`      | Add green flag section alongside red flags, net assessment line               |
| `app/api/ai/applicants/[id]/analysis/route.ts` | Inject green flags into AI prompt context                                     |

## Fulfillment Table

| Signal                     | How It's Detected                                                                 | Min Confidence |
| -------------------------- | --------------------------------------------------------------------------------- | -------------- |
| **Verified income**        | Affordability ratio ≥3.0 + income score ≥80 + documentation ≥70 + reliable source | 70%            |
| **Strong payment history** | TenantMemory on-time rate ≥95% + 0 violations + rental history ≥80                | 60%            |
| **Stable employment**      | Income score ≥85 + docs ≥70 + affordability ≥3.5 + verified source                | 65%            |
