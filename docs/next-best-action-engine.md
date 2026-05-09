# Next Best Action Engine — Design Document

## Overview

The Next Best Action (NBA) engine is a rule-based recommendation system that proactively surfaces the most impactful actions a landlord/property manager should take on each applicant in their pipeline. It eliminates the cognitive overhead of manually triaging applicants by prioritizing, explaining, and enabling one-click execution of operational decisions.

## Design Principles

1. **Proactive, not reactive** — The engine generates actions automatically when the applicant panel expands, without requiring manual triggers.
2. **Priority-driven** — Actions are ranked P0 → P1 → P2 → info, ensuring urgent issues (failed inspections, approaching move-in dates) appear before routine tasks.
3. **Explainable** — Every action includes an explainability block showing which rule fired, what facts were considered, and what policy thresholds applied.
4. **Confidence-calibrated** — Confidence is computed from three factors: base rule confidence × data completeness × data freshness × historical accuracy feedback.
5. **Fatigue-aware** — Maximum 3 actions per applicant prevents overwhelming the user.
6. **Feedback-driven improvement** — Historical accuracy per action type improves future confidence calculations.
7. **Automation-ready** — Safe actions can be automatically applied when organization settings permit.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dashboard (applicant-dashboard.tsx)           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ApplicantList (applicant-list.tsx)                      │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  ActionPanel (action-panel.tsx)                  │   │   │
│  │  │  ┌────────────────────┐  ┌────────────────────┐ │   │   │
│  │  │  │ ActionCard         │  │ ActionHistoryList  │ │   │   │
│  │  │  │  • ConfidenceBadge │  │  • Feedback btns   │ │   │   │
│  │  │  │  • FactTrail       │  │  • History log     │ │   │   │
│  │  │  │  • OverrideDialog  │  │                    │ │   │   │
│  │  │  └────────────────────┘  └────────────────────┘ │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           │ HTTP
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Layer                                                     │
│  POST /api/actions/generate/:applicantId       → Generate      │
│  PATCH /api/actions/:actionId                  → Act (accept/  │
│                                                    skip/override)│
│  GET /api/actions/history/:applicantId         → History       │
│  PATCH /api/actions/:actionId/feedback         → Feedback      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Engine Layer (lib/action-engine.ts)                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  13 Condition Rules → Priority Assignment → Cap to 3  │    │
│  │  Confidence = base × completeness × freshness × hist   │    │
│  │  Explainability = { rule, facts, policyThreshold }     │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Feedback Layer (lib/feedback-engine.ts)                       │
│  MongoDB aggregation pipeline → accuracy per actionType         │
│  Used to calibrate future confidence scores                     │
└─────────────────────────────────────────────────────────────────┘
```

## Priority System

| Priority | Label  | Meaning                                              | Color       |
| -------- | ------ | ---------------------------------------------------- | ----------- |
| P0       | URGENT | Requires immediate attention (legal/compliance risk) | Rose        |
| P1       | HIGH   | Important operational decision with time sensitivity | Amber       |
| P2       | NORMAL | Standard workflow step, no urgency                   | Slate       |
| info     | INFO   | Informational suggestion, advisory only              | Slate faded |

### P0 Actions (Current)

1. **resolve_failed_inspection** — Inspection failed, applicant stuck. Must reschedule or reject.
2. **expedite_risk_review** — Risk-rated applicant approaching move-in date. Must decide before occupancy.

### P1 Actions (Current)

3. **run_screening** — Resident score missing. Need background check before decision.
4. **followup_screening** — Stuck in screening >7 days. Pipeline bottleneck.
5. **approve_applicant** — Strong applicant, no red flags, ready to approve.
6. **verify_subsidy** — Housing subsidy pending >30 days. Needs verification.
7. **schedule_inspection** — Subsidized applicant needs passed inspection.

### P2 Actions (Current)

8. **intake_applicant** — New applicant. Move to screening or request contact info.
9. **verify_income_docs** — Documentation score below policy threshold.
10. **review_duplicate** — Possible duplicate application detected.
11. **request_contact_info** — Missing email or phone.

### Info Actions (Current)

12. **archive_applicant** — Rejected >30 days ago. Clean up pipeline.
13. **request_coapplicant_info** — Co-applicants missing contact details.

## Confidence Calculation

```
confidence = round(min(
  baseConfidence × dataCompleteness × (0.7 + 0.3 × dataFreshness) × blend,
  100
))
```

**Where:**

- **baseConfidence** — Per-rule constant (70–100). Represents rule certainty with perfect data.
- **dataCompleteness** — Ratio of required fields that are populated (0–1). If a rule needs 5 fields and only 3 are set, completeness = 0.6.
- **dataFreshness** — Decay function based on `updatedAt` (1.0 for ≤1 day, 0.3 for >90 days). Fresh data → higher confidence.
- **historicalAccuracy blend** — When feedback exists: `confidence = raw × 0.8 + historicalAccuracy × 20`. This blends past accuracy into current predictions.
- **maxConfidence** — Always equals `baseConfidence`. Represents the ceiling achievable with perfect data.

**Example:**

```
Rule: "run_screening" (base=85)
Data completeness: 4/5 required fields filled = 0.8
Data freshness: updated 3 days ago = 0.9
Historical accuracy for "run_screening": 72%

raw = 85 × 0.8 × (0.7 + 0.3 × 0.9) = 85 × 0.8 × 0.97 = 65.96
with historical = 65.96 × 0.8 + 72 × 0.2 = 52.77 + 14.4 = 67.17
confidence = round(67) → 67%
maxConfidence = 85%
```

## Explainability Model

Every action includes an `explainability` array where each item contains:

| Field             | Type                    | Description                                                 |
| ----------------- | ----------------------- | ----------------------------------------------------------- |
| `rule`            | string                  | The rule ID that fired (e.g. "failed_inspection_stuck")     |
| `facts`           | Record<string, unknown> | Key-value pairs of data that triggered the rule             |
| `policyThreshold` | unknown                 | Optional threshold from the organization's screening policy |

**Example:**

```json
{
  "rule": "resident_score_missing",
  "facts": {
    "residentScore": 0,
    "scoresResident": 0,
    "status": "Screening"
  },
  "policyThreshold": {
    "minResidentScore": 560
  }
}
```

This is rendered in the UI as an expandable "Show facts" section below each ActionCard, providing full transparency into the recommendation.

## Automation Model

Each action has two automation flags:

- **automationSafe** (static per rule/condition) — Can this action be safely applied without human review? Set per-instance (e.g., "intake_applicant" is safe ONLY if email+phone are present).
- **automationAvailable** (runtime) — `automationSafe && organization.settings.autoStatusEnabled`. A toggle in org settings enables/disables auto-application.

When an action with `automationAvailable=true` is accepted, the API route automatically applies the corresponding state change (e.g., status → "Screening" for intake, status → "Rejected" for archive).

## Feedback Loop

The feedback engine (`lib/feedback-engine.ts`) runs a MongoDB aggregation pipeline:

```
1. Match: resolved actions (accepted/skipped/overridden/auto_applied)
          with outcome data (positive/negative/neutral)
2. Group: by actionType
3. Project: weighted accuracy
            positive = 1.0, neutral = 0.5, negative = 0.0
            accuracy = sum(weighted) / total × 100
```

This accuracy map is passed into `generateActionsForApplicant()` and used to calibrate confidence for each action type. Over time, rules that consistently receive positive feedback gain higher confidence, and vice versa.

## One-Click Workflows

The UI supports three one-click actions per card:

| Action   | Button     | Behavior                        | API Effect                               |
| -------- | ---------- | ------------------------------- | ---------------------------------------- |
| Accept   | ✓ Accept   | User agrees with recommendation | `status → accepted`, optional auto-apply |
| Skip     | ↩ Skip     | User dismisses without action   | `status → skipped`                       |
| Override | ↻ Override | User disagrees, provides reason | `status → overridden`, reason stored     |

After any action, the card moves from "pending actions" to "action history" immediately via state update (no full reload needed). The history section shows past actions with feedback buttons (👍 / ... / 👎) for continuous improvement.

## Data Flow

```
[Panel Expands]
    │
    ▼
POST /api/actions/generate/:id     ← Calls action-engine
    │                                 Upserts to DB
    ▼
Return { pending[], history[] }
    │
    ├─ Pending → ActionCard[] with Accept/Skip/Override
    └─ History → ActionHistoryList[] with Feedback buttons
    │
    ▼
[User Accepts]
    │
    ▼
PATCH /api/actions/:id
  { outcome: "accepted" }
    │
    ├─ Status → "accepted"
    ├─ actedAt → now
    ├─ If automationAvailable → auto-apply state change
    └─ Audit log entry
    │
    ▼
[State update]
  Remove from pending[]
  Prepend to history[]
```

## Key Files

| File                                              | Purpose                                                |
| ------------------------------------------------- | ------------------------------------------------------ |
| `lib/action-engine.ts`                            | 13 rules, confidence calc, dedup, pipeline stats, hash |
| `lib/feedback-engine.ts`                          | Historical accuracy aggregation pipeline               |
| `models/ApplicantAction.ts`                       | Mongoose schema with indexes and dedup constraint      |
| `components/dashboard/action-panel.tsx`           | Orchestrates generation + state management             |
| `components/dashboard/action-card.tsx`            | Action display with accept/skip/override               |
| `components/dashboard/action-history-list.tsx`    | History with feedback buttons                          |
| `components/dashboard/confidence-badge.tsx`       | Visual confidence indicator                            |
| `components/dashboard/fact-trail.tsx`             | Expandable rule facts display                          |
| `components/dashboard/override-dialog.tsx`        | Reason entry for manual overrides                      |
| `app/api/actions/generate/[applicantId]/route.ts` | POST → generate + upsert                               |
| `app/api/actions/[actionId]/route.ts`             | GET single / PATCH accept/skip/override                |
| `app/api/actions/history/[applicantId]/route.ts`  | GET history                                            |
| `app/api/actions/[actionId]/feedback/route.ts`    | PATCH feedback                                         |

## Performance Characteristics

- **Generation time** ~5ms per applicant (13 rule evaluations + math)
- **Capped output** at 3 actions per applicant (prevents fatigue)
- **Deduplication** via partial unique index + previousActionIds set (prevents duplicate pending actions)
- **Rate limiting** at 30 req/min for generate, 60 req/min for act, 60 req/min for feedback
- **Hash-based idempotency** — same applicant state + context produces same generation hash, preventing redundant database writes

## Future Extensibility

To add a new rule:

1. Add a new entry to `ACTION_RULES` array in `lib/action-engine.ts`
2. Define `id`, `condition`, `generate`, `priorityBase`, `confidenceBase`, `requiredFields`, `automationSafe`
3. Add the corresponding auto-apply logic in the API route's `PATCH` handler if needed
4. Tests go in `tests/lib/action-engine.test.ts`

No other files need changes — the engine automatically iterates all rules for every applicant.
