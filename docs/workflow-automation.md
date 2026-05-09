# Workflow Automation — Design Document

## Overview

The Workflow Automation system reduces repetitive administrative tasks by letting property managers define automated pipelines: when a condition is met (trigger), evaluate rules (conditions), optionally require a human to confirm (approval checkpoint), apply the state change (action), record everything (audit), and provide a way to undo (rollback). The system integrates with the Next Best Action engine to power AI-assisted recommendations for automation decisions.

## Design Principles

1. **Start with recommendations, graduate to automation** — The NBA engine recommends what _could_ be automated. The user explicitly enables automation per capability. No action is automatically taken without opt-in.
2. **Safe by default** — Actions that affect legal or financial status (approvals, rejections) always require human approval. Only reversible administrative actions (intake → screening, archive) can be fully automated.
3. **Confidence-gated** — Automation only fires when confidence exceeds the organization's configured threshold (`autoStatusMinConfidence: 90`). Low-confidence decisions always route to human review.
4. **Every action is audited** — Every automated state change produces an audit log entry with actor, action, entity, before/after state, and metadata. No silent state changes.
5. **Rollback is first-class** — Every automated action that changed applicant state records the pre-mutation snapshot, enabling one-click undo.
6. **Feedback trains the system** — Automated actions are tagged `auto_applied` and included in the feedback loop, so their outcomes calibrate future confidence.

## Current Implementation Baseline

The codebase already has the following automation substrate:

### Organization Settings (`models/Organization.ts`)

```typescript
automationSettings: {
  autoStatusEnabled: boolean; // default: false
  autoStatusMinConfidence: number; // default: 90
  autoApproveEnabled: boolean; // default: false
  autoArchiveAfterDays: number; // default: 90
  actionExpiryDays: number; // default: 7
}
```

### Action Model (`models/ApplicantAction.ts`)

```typescript
// Statuses that support automation:
status: "pending" |
  "accepted" |
  "skipped" |
  "overridden" |
  "expired" |
  "auto_applied";

// Automation flags:
automationSafe: boolean; // Can this action be safely auto-applied?
automationAvailable: boolean; // Is automation enabled for this action type?

// Lifecycle tracking:
generatedAt: Date;
expiresAt: Date | null; // Pending actions expire after actionExpiryDays
dismissedAt: Date | null;
```

### Action Engine (`lib/action-engine.ts`)

```typescript
// automationAvailable logic:
automationAvailable =
  base.automationSafe &&
  (rule.id === "auto_archive_eligible"
    ? true
    : ctx.automationSettings.autoStatusEnabled);
```

### API Auto-Apply (`app/api/actions/[actionId]/route.ts`)

```typescript
if (body.outcome === "accepted" && action.automationAvailable) {
  if (action.actionType === "intake_applicant") {
    // status → "Screening"
  } else if (action.actionType === "archive_applicant") {
    // status → "Rejected"
  }
}
```

### Feedback Loop (`lib/feedback-engine.ts`)

```typescript
// auto_applied actions are included in accuracy calculation
$match: {
  status: { $in: ["accepted", "skipped", "overridden", "auto_applied"] },
  outcome: { $in: ["positive", "negative", "neutral"] },
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Automation Engine                            │
│                                                                     │
│  ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐  │
│  │  Trigger Layer │ →  │  Condition     │ →  │  Action Layer   │  │
│  │                │    │  Evaluator     │    │                 │  │
│  │ • NBA generate │    │ • confidence   │    │ • auto-apply    │  │
│  │ • timer/cron   │    │ • threshold    │    │ • human approve │  │
│  │ • webhook      │    │ • org policy   │    │ • rollback      │  │
│  │ • manual       │    │ • audit check  │    │ • audit log     │  │
│  └───────┬────────┘    └───────┬────────┘    └────────┬────────┘  │
│          │                     │                       │           │
│          ▼                     ▼                       ▼           │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    History & Audit Layer                    │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │ Applicant    │  │ AuditLog     │  │ ActionFeedback   │  │  │
│  │  │ before/after │  │ (actor,      │  │ (outcome,        │  │  │
│  │  │ snapshots    │  │  entity, ts) │  │  outcomeNote)    │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  NBA Engine (lib/action-engine.ts)                                 │
│  generateActionsForApplicant() → ActionSuggestion[]                │
│    • 13 rules with automationSafe flags                             │
│    • confidence calibrated by data completeness, freshness, history │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Feedback Engine (lib/feedback-engine.ts)                          │
│  computeHistoricalAccuracy() → Record<string, number>              │
│    • Weighs auto_applied + human actions                            │
│    • Accuracy feeds back into NBA confidence                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Automation Triggers

The system supports four trigger types:

### 1. NBA-Generated Trigger (implemented)

**Trigger:** User expands ActionPanel → `POST /api/actions/generate/:id`
**Evaluation:** NBA engine evaluates 13 rules, computes confidence, sets `automationAvailable`
**Action:** If `automationAvailable && confidence >= threshold`, the action card shows "Auto" badge
**Human step:** User clicks Accept → auto-apply fires

### 2. Scheduled/Cron Trigger (future)

**Trigger:** Cron job runs daily at configurable time
**Evaluation:** Batch-process all pending actions that are automation-safe and above confidence threshold
**Action:** Auto-apply without human intervention for non-P0/P1 actions
**Approval:** P0/P1 actions still require human confirmation (notified via push)

### 3. Webhook Trigger (future)

**Trigger:** External event (e.g. screening report received from ResidentScore API)
**Evaluation:** Incoming data triggers re-evaluation of the affected applicant
**Action:** Update applicant data + auto-apply relevant actions
**Approval:** Configurable per webhook source

### 4. Manual Trigger (implemented)

**Trigger:** User explicitly clicks Accept on an ActionCard
**Evaluation:** Already evaluated by NBA engine; API just applies
**Action:** Apply immediately
**Approval:** User is present — highest trust level

## Conditions System

Each automation path passes through a conditions pipeline:

### Condition 1: Automation Safety

```typescript
automationSafe === true;
```

Hard-coded per rule. Some actions can NEVER be automated (e.g., "expedite_risk_review" involves a legal decision).

### Condition 2: Organization Settings

```typescript
organization.automationSettings.autoStatusEnabled === true;
```

Global toggle. When disabled, all automation is blocked regardless of individual action safety.

### Condition 3: Confidence Threshold

```typescript
action.confidence >= organization.automationSettings.autoStatusMinConfidence;
```

Default: 90%. Configurable per organization. Low-confidence actions route to human review even if automation-safe.

### Condition 4: Priority Gate

```typescript
if (priority === "P0") → ALWAYS human review
if (priority === "P1" && autoApproveEnabled === false) → human review
if (priority === "P2" || priority === "info") → auto-apply allowed
```

P0 actions are never auto-applied. P1 requires explicit opt-in (`autoApproveEnabled`). P2/info can be auto-applied.

### Condition 5: Dedup Check

```typescript
!previousActionIds.has(`${applicantId}:${rule.id}:pending`);
```

Prevents duplicate pending actions. Already implemented in NBA engine.

## AI-Assisted Recommendations

The NBA engine powers the recommendation layer for automation decisions:

### What to automate (Operational Inbox → Automation section)

The `findAutomationOpportunities()` detector in `lib/ai-operations.ts` surfaces items like:

- "N applicants ready for auto-status" (email + phone present)
- "N rejected applicants eligible for auto-archive"

These appear in the Priority Feed's Automation section with confidence levels.

### Confidence calibration per action type

```typescript
// lib/action-engine.ts
automationAvailable =
  base.automationSafe &&
  (rule.id === "auto_archive_eligible"
    ? true
    : ctx.automationSettings.autoStatusEnabled);
```

The engine explicitly marks each generated action with both `automationSafe` (static rule property) and `automationAvailable` (runtime from org settings). The UI shows an "Auto" badge when `automationAvailable` is true.

### Historical accuracy influence

```typescript
// computeConfidence() in action-engine.ts
if (historicalAccuracy !== null) {
  confidence = rawConfidence * 0.8 + historicalAccuracy * 20;
}
```

As the feedback loop accumulates data, action types with high historical accuracy gain higher confidence, making them more likely to meet the automation threshold.

## Human Approval Checkpoints

The system enforces approval at multiple stages:

### Stage 1: Organization Settings Page (Admin UI)

```
Auto-status (New → Screening):  [OFF]  [ON]  Threshold: [90]%
Auto-approve (Strong → Approved): [OFF]  [ON]
Auto-archive after: [90] days
Action expiry: [7] days
```

Each automation capability has an independent toggle. The Admin UI reads/writes `organization.automationSettings`.

### Stage 2: ActionCard UI

```
┌─────────────────────────────────────┐
│  P1  [67%]          [Auto] badge   │  ← Shows automation status
│  Run background check — Jane Doe   │
│  ✓ Accept    ↩ Skip    ↻ Override  │  ← User must click Accept
└─────────────────────────────────────┘
```

Even when `automationAvailable=true`, the user must explicitly click Accept. The "Auto" badge indicates it will auto-apply on accept, not that it fires automatically.

### Stage 3: Override Dialog (when user disagrees)

```
┌─────────────────────────────────────┐
│  Override Recommendation            │
│  System confidence: 67%             │
│  Reason: ___________________        │
│  [Cancel]  [Confirm override]       │
└─────────────────────────────────────┘
```

Overrides require a reason (stored in audit log). Non-dismissible P0 actions force the user to either resolve the underlying issue or explicitly override.

### Stage 4: Future Cron-based auto-apply

When scheduled automation is implemented, it will:

1. Only process P2/info actions (never P0/P1)
2. Check confidence threshold before applying
3. Send notification after auto-apply with undo link
4. Respect a cool-down period (no more than 1 auto-action per applicant per 24h)

## Audit Logging

Every automation event writes to the AuditLog collection via `recordAuditLog()` in `lib/audit-log.ts`.

### Audit event types

| Action               | Trigger                | Logged Data                                      |
| -------------------- | ---------------------- | ------------------------------------------------ |
| `actions.generated`  | NBA engine runs        | actionCount, actionTypes, applicantId            |
| `action.accepted`    | User clicks Accept     | actionType, applicantId, autoApplied             |
| `action.skipped`     | User clicks Skip       | actionType, applicantId                          |
| `action.overridden`  | User provides override | actionType, reason, applicantId                  |
| `action.feedback`    | User rates outcome     | actionType, outcome (pos/neg/neutral)            |
| `automation.applied` | System auto-applies    | actionType, applicantId, beforeState, afterState |

### Audit log entry format

```typescript
{
  organizationId: ObjectId,
  actorUserId: ObjectId | null,  // null for system actions
  actorName: string,
  actorEmail: string,
  action: string,                // namespaced: "actions.generated", "action.accepted", etc.
  entityType: string,            // "applicant", "applicant_action"
  entityId: string,
  level: "info" | "warning" | "error",
  message: string,
  metadata: {
    beforeState?: Record<string, unknown>,  // Pre-mutation snapshot
    afterState?: Record<string, unknown>,   // Post-mutation snapshot
    actionType?: string,
    applicantId?: string,
    outcome?: string,
    overrideReason?: string | null,
    autoApplied?: boolean,
  }
}
```

### Current audit points (already implemented)

The following API routes already call `recordAuditLog()`:

- `POST /api/actions/generate/[applicantId]` — logs generation
- `PATCH /api/actions/[actionId]` — logs accept/skip/override
- `PATCH /api/actions/[actionId]/feedback` — logs feedback

## Rollback Safety

### Snapshot Strategy

Before any automated state change, the API captures the applicant document's current state as `beforeState` in the audit metadata:

```typescript
async function applyWithRollback(
  applicantId: string,
  mutation: Record<string, unknown>,
  action: ApplicantActionDocument,
) {
  // 1. Capture before state
  const before = await Applicant.findById(applicantId).lean();

  // 2. Apply the mutation
  await Applicant.findByIdAndUpdate(applicantId, { $set: mutation });

  // 3. Store rollback info on the action
  action.rollbackData = { beforeState: before };
  await action.save();

  // 4. Audit
  await recordAuditLog({
    ...
    metadata: {
      beforeState: before,
      afterState: mutation,
      autoApplied: true,
    },
  });
}
```

### Rollback Implementation (future API)

```typescript
POST /api/actions/:actionId/rollback

// 1. Verify action was auto_applied
// 2. Restore applicant to beforeState
// 3. Create a "rolled_back" status on the action
// 4. Audit the rollback
```

The `ApplicantAction` schema would need a new field:

```typescript
rollbackData: {
  type: {
    beforeState: { type: Schema.Types.Mixed },
    afterState: { type: Schema.Types.Mixed },
    rolledBack: { type: Boolean, default: false },
    rolledBackAt: { type: Date, default: null },
  },
  default: null,
}
```

### Undo Window

- Auto-applied actions can be rolled back within a configurable window (default: 24 hours)
- After the window, the action is "finalized" and rollback is disabled
- P0 actions that were manually accepted (not auto-applied) cannot be rolled back via this mechanism — they require manual override

## State Machine

```
                  ┌─────────────┐
                  │   pending   │
                  └──────┬──────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ accepted │  │  skipped │  │overridden│
     │(manual)  │  │          │  │          │
     └──────────┘  └──────────┘  └──────────┘
           │
           │ (if automationAvailable)
           ▼
     ┌──────────────┐
     │ auto_applied │ ←─ State change applied
     └──────┬───────┘
            │
            │ (within undo window)
            ▼
     ┌──────────────┐
     │  rolled_back │ ←─ State restored from snapshot
     └──────────────┘

  ┌────────────┐
  │  expired   │ ←─ Pending action exceeded expiryDays
  └────────────┘
```

## Automation Opportunities (Current vs. Future)

| Automation Type             | Current Status      | Rule                         | Auto-Safe            | Auto-Available      |
| --------------------------- | ------------------- | ---------------------------- | -------------------- | ------------------- |
| New → Screening (intake)    | ✅ Implemented      | `new_applicant_needs_intake` | Yes (if email+phone) | `autoStatusEnabled` |
| Strong → Approved           | ❌ Not auto-applied | `approve_applicant`          | No                   | Always human        |
| Rejected → Archived         | ✅ Implemented      | `auto_archive_eligible`      | Yes                  | Always (hard-coded) |
| Screening stale → Follow-up | ❌ Not auto-applied | `followup_screening`         | No                   | Always human        |
| Subsidy verification        | ❌ Not auto-applied | `verify_subsidy`             | No                   | Always human        |
| Failed inspection           | ❌ Not auto-applied | `resolve_failed_inspection`  | No                   | Always human (P0)   |

### Future automation targets

1. **Auto-status for new applicants** — Already implemented. When email+phone are present and `autoStatusEnabled` is on, accepting auto-moves to Screening.
2. **Auto-archive** — Already implemented. Rejected + >30 days stale auto-archives on accept.
3. **Auto-expiry** — Future. Expired pending actions auto-transition to `expired` status.
4. **Auto-screening report request** — Future. When resident score is missing and applicant has contact info, automatically trigger screening API.
5. **Auto-comparison** — Future. When >3 Strong applicants exist, automatically run AI comparison and surface results.

## Implementation of Current Automation Flow

### Step-by-step: Auto-Intake

```
1. User adds applicant → status = "New"
2. User expands ActionPanel → POST /api/actions/generate/:id
3. NBA engine evaluates:
   - Rule "new_applicant_needs_intake" → condition: status === "New"
   - automationSafe = Boolean(email && phone)
   - automationAvailable = automationSafe && autoStatusEnabled
   → ActionSuggestion { actionType: "intake_applicant", automationSafe: true, automationAvailable: true }
4. ActionCard renders with "Auto" badge
5. User clicks Accept
6. PATCH /api/actions/:id { outcome: "accepted" }
7. API checks: outcome === "accepted" && action.automationAvailable === true
8. YES → Applicant.findByIdAndUpdate(id, { $set: { status: "Screening" } })
9. Audit log: action "action.accepted", metadata { autoApplied: true }
10. UI removes from pending[], prepends to history[]
```

### Step-by-step: Manual Override

```
1. ActionCard for "Failed inspection" renders as P0 (non-dismissible)
2. User inspects the applicant, determines inspection was erroneous
3. User clicks Override → OverrideDialog opens
4. User enters reason: "Inspection was a false alarm, inspector confirmed"
5. User clicks "Confirm override"
6. PATCH /api/actions/:id { outcome: "overridden", overrideReason: "..." }
7. API: status → "overridden", overrideReason stored
8. Audit log: action "action.overridden", metadata { overrideReason: "..." }
9. Action moves to history with ↻ icon
```

## Key Files

| File                                              | Role in Automation                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `models/Organization.ts`                          | `automationSettings` — global automation configuration                                |
| `models/ApplicantAction.ts`                       | Action lifecycle: pending → accepted/skipped/overridden/auto_applied/expired          |
| `lib/action-engine.ts`                            | Rule evaluation, `automationSafe`/`automationAvailable` flags, confidence calculation |
| `lib/feedback-engine.ts`                          | Historical accuracy → future confidence calibration                                   |
| `lib/audit-log.ts`                                | `recordAuditLog()` — every action is audited                                          |
| `app/api/actions/[actionId]/route.ts`             | Accept/skip/override handler with auto-apply logic                                    |
| `app/api/actions/generate/[applicantId]/route.ts` | NBA generation + upsert with dedup                                                    |
| `app/api/actions/[actionId]/feedback/route.ts`    | Feedback collection for auto_applied actions                                          |
| `components/dashboard/action-card.tsx`            | UI with "Auto" badge, Accept/Skip/Override buttons                                    |
| `components/dashboard/override-dialog.tsx`        | Reason capture for manual overrides                                                   |
| `components/dashboard/action-panel.tsx`           | Orchestrates generation and state management                                          |

## Fulfillment Table

| Requirement                     | How It's Met                                                                                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Triggers**                    | 4 trigger types: NBA expansion (implemented), scheduled cron (future), webhook (future), manual click (implemented)                                              |
| **Conditions**                  | 5-condition pipeline: safety flag, org settings, confidence threshold, priority gate, dedup check                                                                |
| **AI-assisted recommendations** | NBA engine generates 13 action types with per-instance `automationSafe` flag, confidence calibrated by historical feedback                                       |
| **Human approval checkpoints**  | 4 stages: Admin toggles per capability, ActionCard requires explicit Accept, OverrideDialog forces reason entry, P0 never auto-applies                           |
| **Audit logging**               | Every action writes to AuditLog via `recordAuditLog()` — 4 event types already implemented (generate, accept, override, feedback)                                |
| **Rollback safety**             | Pre-mutation snapshot captured as `beforeState` in audit metadata. Proposed `rollbackData` field on ApplicantAction for one-click undo. Undo window of 24 hours. |
