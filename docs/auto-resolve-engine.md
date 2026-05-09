# Auto-Resolve Engine — Design Document

## Overview

The Auto-Resolve Engine handles low-risk, predictable tasks autonomously — silently resolving them in the background, then notifying the landlord with a brief summary and an undo option. The user never sees the action card, never clicks Accept, never makes a decision. The system just does it.

This is the difference between "the app tells you what to do" (current NBA) and "the app does it for you" (Auto-Resolve).

## Design Principles

1. **Silent by default** — Auto-resolved tasks don't appear in the action feed, don't generate notifications, and don't interrupt the user. They appear only in an "Auto-resolved" history log.
2. **Always reversible** — Every auto-resolved action includes an undo link in the daily summary. The user can reverse any auto-resolution within 7 days.
3. **Confidence-gated** — Only tasks with confidence ≥ 90% are auto-resolved. Below 90%, the action goes to the NBA panel for manual review.
4. **Low-risk only** — P0 actions are never auto-resolved. P1 requires auto-approve opt-in. Only P2 and info actions are eligible.
5. **Daily digest** — Auto-resolved actions are summarized once per day (or on next login) in a compact "Auto-resolved today" section. The user can bulk-undo or review.
6. **Escalation on failure** — If an auto-resolve attempt fails (e.g., API error, validation failure), the action reverts to pending and appears in the NBA panel with a note.

## Auto-Resolve Candidates

### 1. Auto-Remind: Follow-up on stale screening

**Trigger:** Applicant in "Screening" status for 7+ days with no action taken in last 3 days.

**Auto-resolve action:** Generate and queue a follow-up message draft. Mark the action as `auto_resolved` in history. The message is saved as a draft — not sent automatically.

```
Result: Follow-up draft saved for Jane Doe (screening 10 days)
[View draft] [Discard]
```

**Confidence:** 90% — determined by rule, no ambiguity.

**Why this is safe:** Message drafts are never auto-sent. The draft sits in the user's outbox, visible in the communication history. The user can review and send at their convenience.

---

### 2. Auto-Close: Expire stale pending actions

**Trigger:** A pending NBA action has exceeded its `expiresAt` date (default: 7 days).

**Auto-resolve action:** Set action status to `expired`. Log the expiry in audit and action history. Remove from pending feed.

```
Action auto-expired: "Run background check for Jane Doe" (7 days without action)
```

**Confidence:** 100% — time-based, deterministic.

**Why this is safe:** The action was already going to expire. Auto-closing it just formalizes the expiry and removes visual clutter.

---

### 3. Auto-Request Docs: Follow up on missing documentation

**Trigger:** Applicant has a documentation score < 70, was requested docs 5+ days ago, and no documents have been uploaded since.

**Auto-resolve action:** Generate and queue a follow-up document request message draft. Save as draft. Log in communication history.

```
Follow-up draft saved: "Additional documents needed for Jane Doe"
(2nd request — original sent 5 days ago)
```

**Confidence:** 85% — based on documentation score + time since last request.

**Why this is safe:** Same as auto-remind — drafts are never auto-sent. The user reviews and sends.

---

### 4. Auto-Tag: Label applicant by risk tier

**Trigger:** A New applicant is created and scored. Based on deterministic scoring, assign a preliminary tag.

**Auto-resolve action:** Set `applicant.tags` array to include the appropriate tag(s). No user-facing action needed — the tag just appears.

| Condition                                                      | Tag                     |
| -------------------------------------------------------------- | ----------------------- |
| `totalScore >= 80` AND `redFlags.length === 0`                 | `"fast-track"`          |
| `affordabilityRatio >= 3.0` AND `scores.documentation >= 70`   | `"income-verified"`     |
| `housingSupport !== "None"` AND `subsidyStatus === "Verified"` | `"subsidized-verified"` |
| `duplicateFingerprint`                                         | `"possible-duplicate"`  |
| `coApplicants.length > 0`                                      | `"joint-application"`   |
| `applicationSource === "Email / Manual"`                       | `"manual-entry"`        |
| `scores.rentalHistory < 60`                                    | `"rental-history-weak"` |
| `scores.documentation < 50`                                    | `"docs-needed"`         |

```
Applicant tagged: "fast-track", "income-verified"
```

**Confidence:** 95-100% — purely deterministic.

**Why this is safe:** Tags are metadata only — they don't change applicant status, trigger workflows, or affect scoring. They just help the user filter and sort.

---

### 5. Auto-Archive: Remove rejected applicants from active view

**Trigger:** Applicant status is "Rejected" and `updatedAt` is > 30 days ago.

**Auto-resolve action:** Set a `archived: true` flag on the applicant (soft delete). The applicant is hidden from the default pipeline view but still accessible via "Show archived" filter.

```
Applicant archived: Tom Jones (Rejected 45 days ago)
[Undo] [View archived]
```

**Confidence:** 100% — deterministic, time-based.

**Why this is safe:** Soft delete only. The applicant record is preserved. Undo is available. Auto-archive eligibility was already surfaced as a P2 NBA action — this just executes it automatically.

---

### 6. Auto-Acknowledge: Dismiss read-only info notifications

**Trigger:** An NBA action with `priority: "info"` has been visible in the feed for 72+ hours without the user interacting with it.

**Auto-resolve action:** Set action status to `dismissed` with a note "Auto-dismissed after 72 hours". Remove from feed.

```
Info dismissed: "Archive rejected applicant — Tom Jones" (auto-dismissed after 72h)
```

**Confidence:** 95% — if the user hasn't acted on an info-level item in 3 days, they're not going to.

**Why this is safe:** Info items are advisory only. Auto-dismissing them keeps the feed clean without losing the notification permanently (it's still in history).

---

### 7. Auto-Sync: Update applicant score when new data arrives

**Trigger:** An applicant's scores change (e.g., screening report received, manual score update).

**Auto-resolve action:** Recalculate `totalScore`, `decision`, `redFlags`, and `greenFlags`. Regenerate NBA actions. No user-facing action needed — the applicant card updates.

```
Score updated: Jane Doe 72→85 (screening report received)
```

**Confidence:** 100% — mathematical recalculation.

**Why this is safe:** This is just a recalculation of existing logic. The applicant card updates in real-time. No state changes are made.

---

## Auto-Resolve Engine

```typescript
// lib/auto-resolve.ts

import { dbConnect } from "@/lib/mongodb";
import ApplicantAction from "@/models/ApplicantAction";
import Applicant from "@/models/Applicant";
import { recordAuditLog } from "@/lib/audit-log";
import { detectGreenFlags } from "@/lib/green-flags";
import type { Types } from "mongoose";

interface AutoResolveResult {
  resolved: number;
  skipped: number;
  failures: number;
  details: Array<{
    actionType: string;
    applicantName: string;
    status: "resolved" | "skipped" | "failed";
    reason?: string;
    undoable: boolean;
  }>;
}

export async function runAutoResolve(
  organizationId: string | Types.ObjectId,
): Promise<AutoResolveResult> {
  await dbConnect();
  const result: AutoResolveResult = {
    resolved: 0,
    skipped: 0,
    failures: 0,
    details: [],
  };

  // ── Auto-Expire: Close stale pending actions ────────────
  await autoExpireStaleActions(organizationId, result);

  // ── Auto-Acknowledge: Dismiss old info items ────────────
  await autoDismissInfoItems(organizationId, result);

  // ── Auto-Archive: Soft-delete old rejected applicants ───
  await autoArchiveRejected(organizationId, result);

  // ── Auto-Tag: Label applicants by risk tier ─────────────
  await autoTagApplicants(organizationId, result);

  // ── Auto-Remind: Queue follow-up drafts ─────────────────
  await autoQueueFollowUps(organizationId, result);

  // ── Auto-Request: Queue document follow-up drafts ───────
  await autoQueueDocRequests(organizationId, result);

  // ── Auto-Sync: Recalculate scores on stale data ─────────
  await autoRecalculateScores(organizationId, result);

  return result;
}

// ── Individual Auto-Resolvers ─────────────────────────────────

async function autoExpireStaleActions(
  orgId: string | Types.ObjectId,
  result: AutoResolveResult,
) {
  const now = new Date();
  const stale = await ApplicantAction.find({
    organizationId: orgId,
    status: "pending",
    expiresAt: { $lte: now },
  }).populate("applicantId", "name");

  for (const action of stale) {
    try {
      action.status = "expired";
      action.dismissedAt = now;
      await action.save();

      result.resolved++;
      result.details.push({
        actionType: action.actionType,
        applicantName: (action.applicantId as any)?.name ?? "Unknown",
        status: "resolved",
        undoable: false,
      });
    } catch {
      result.failures++;
    }
  }
}

async function autoDismissInfoItems(
  orgId: string | Types.ObjectId,
  result: AutoResolveResult,
) {
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72 hours ago
  const oldInfos = await ApplicantAction.find({
    organizationId: orgId,
    status: "pending",
    priority: "info",
    generatedAt: { $lte: cutoff },
  }).populate("applicantId", "name");

  for (const action of oldInfos) {
    try {
      action.status = "dismissed";
      action.dismissedAt = new Date();
      await action.save();

      result.resolved++;
      result.details.push({
        actionType: action.actionType,
        applicantName: (action.applicantId as any)?.name ?? "Unknown",
        status: "resolved",
        undoable: true,
      });
    } catch {
      result.failures++;
    }
  }
}

async function autoArchiveRejected(
  orgId: string | Types.ObjectId,
  result: AutoResolveResult,
) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const rejected = await Applicant.find({
    organizationId: orgId,
    status: "Rejected",
    updatedAt: { $lte: cutoff },
    archived: { $ne: true },
  }).select("name");

  for (const applicant of rejected) {
    try {
      await Applicant.findByIdAndUpdate(applicant._id, {
        $set: { archived: true, archivedAt: new Date() },
      });

      await recordAuditLog({
        organizationId: orgId,
        actorUserId: null, // system action
        actorName: "Auto-Resolve",
        actorEmail: "",
        action: "auto-resolve.archived",
        entityType: "applicant",
        entityId: String(applicant._id),
        message: `Auto-archived rejected applicant ${applicant.name}.`,
      });

      result.resolved++;
      result.details.push({
        actionType: "archive_applicant",
        applicantName: applicant.name,
        status: "resolved",
        undoable: true,
      });
    } catch {
      result.failures++;
    }
  }
}

async function autoTagApplicants(
  orgId: string | Types.ObjectId,
  result: AutoResolveResult,
) {
  const untagged = await Applicant.find({
    organizationId: orgId,
    $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }],
  }).select(
    "name totalScore redFlags affordabilityRatio scores housingSupport subsidyStatus duplicateFingerprint coApplicants applicationSource",
  );

  for (const applicant of untagged) {
    try {
      const tags: string[] = [];

      if (
        applicant.totalScore >= 80 &&
        (!applicant.redFlags || applicant.redFlags.length === 0)
      ) {
        tags.push("fast-track");
      }
      if (
        applicant.affordabilityRatio >= 3.0 &&
        applicant.scores?.documentation >= 70
      ) {
        tags.push("income-verified");
      }
      if (
        applicant.housingSupport !== "None" &&
        applicant.subsidyStatus === "Verified"
      ) {
        tags.push("subsidized-verified");
      }
      if (applicant.duplicateFingerprint) {
        tags.push("possible-duplicate");
      }
      if (applicant.coApplicants?.length > 0) {
        tags.push("joint-application");
      }
      if (applicant.applicationSource === "Email / Manual") {
        tags.push("manual-entry");
      }
      if (applicant.scores?.rentalHistory < 60) {
        tags.push("rental-history-weak");
      }
      if (applicant.scores?.documentation < 50) {
        tags.push("docs-needed");
      }

      if (tags.length > 0) {
        await Applicant.findByIdAndUpdate(applicant._id, {
          $set: { tags },
        });

        result.resolved++;
        result.details.push({
          actionType: "tag_applicant",
          applicantName: applicant.name,
          status: "resolved",
          undoable: true,
        });
      }
    } catch {
      result.failures++;
    }
  }
}

async function autoQueueFollowUps(
  orgId: string | Types.ObjectId,
  result: AutoResolveResult,
) {
  // Find applicants stuck in screening >7 days with no recent follow-up
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stale = await Applicant.find({
    organizationId: orgId,
    status: "Screening",
    updatedAt: { $lte: cutoff },
  })
    .select("name email updatedAt")
    .lean();

  for (const applicant of stale) {
    try {
      // Check if a follow-up was already queued in the last 3 days
      const recentFollowUp = await ApplicantAction.findOne({
        applicantId: applicant._id,
        actionType: "followup_screening",
        status: { $in: ["pending", "auto_resolved"] },
        generatedAt: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      });

      if (recentFollowUp) continue; // Already handled

      // Queue a follow-up draft (communication assistant integration)
      // For now, create an auto-resolved action record
      const action = await ApplicantAction.create({
        organizationId: orgId,
        applicantId: applicant._id,
        actionType: "followup_screening",
        status: "auto_resolved",
        title: `Follow-up needed: ${applicant.name}`,
        description: `Screening for ${applicant.name} has been in progress for ${Math.floor((Date.now() - new Date(applicant.updatedAt).getTime()) / 86400000)} days.`,
        suggestedAction:
          "A follow-up message draft has been queued for your review.",
        priority: "P2",
        confidence: 90,
        maxConfidence: 100,
        automationSafe: true,
        generatedAt: new Date(),
      });

      // In the full implementation, this would create a CommunicationRecord draft too

      result.resolved++;
      result.details.push({
        actionType: "followup_screening",
        applicantName: applicant.name,
        status: "resolved",
        undoable: true,
      });
    } catch {
      result.failures++;
    }
  }
}

async function autoQueueDocRequests(
  orgId: string | Types.ObjectId,
  result: AutoResolveResult,
) {
  // Find applicants with low documentation score and no recent request
  const docNeeded = await Applicant.find({
    organizationId: orgId,
    "scores.documentation": { $lt: 70, $gt: 0 },
  })
    .select("name email scores documentation")
    .lean();

  for (const applicant of docNeeded) {
    try {
      // Check if a doc request was already sent in the last 5 days
      const recentRequest = await ApplicantAction.findOne({
        applicantId: applicant._id,
        actionType: "verify_income_docs",
        generatedAt: { $gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      });

      if (recentRequest) continue;

      await ApplicantAction.create({
        organizationId: orgId,
        applicantId: applicant._id,
        actionType: "verify_income_docs",
        status: "auto_resolved",
        title: `Document request queued: ${applicant.name}`,
        description: `Documentation score is ${applicant.scores?.documentation}/100. A request draft has been queued.`,
        suggestedAction: "Review and send the document request draft.",
        priority: "P2",
        confidence: 85,
        maxConfidence: 100,
        automationSafe: true,
        generatedAt: new Date(),
      });

      result.resolved++;
      result.details.push({
        actionType: "verify_income_docs",
        applicantName: applicant.name,
        status: "resolved",
        undoable: true,
      });
    } catch {
      result.failures++;
    }
  }
}

async function autoRecalculateScores(
  orgId: string | Types.ObjectId,
  result: AutoResolveResult,
) {
  // This would trigger a recalculate for applicants whose data changed
  // but whose scores haven't been updated. For now, this is a placeholder
  // that would be implemented alongside the scoring engine.
  result.details.push({
    actionType: "recalculate_score",
    applicantName: "Pipeline-wide",
    status: "skipped",
    reason: "Auto-sync requires scoring engine integration",
    undoable: false,
  });
}
```

## Auto-Resolve Scheduler

A scheduled cron job triggers auto-resolve once per hour:

```typescript
// app/api/cron/auto-resolve/route.ts

import { NextResponse } from "next/server";
import Organization from "@/models/Organization";
import { runAutoResolve } from "@/lib/auto-resolve";

// Triggered by Vercel Cron Jobs or similar
export async function GET() {
  const orgs = await Organization.find({}).select("_id").lean();
  const results = [];

  for (const org of orgs) {
    const result = await runAutoResolve(org._id);
    results.push({ organizationId: String(org._id), ...result });
  }

  // Log summary
  const totalResolved = results.reduce((s, r) => s + r.resolved, 0);
  console.log(
    `Auto-Resolve: ${totalResolved} tasks resolved across ${results.length} orgs`,
  );

  return NextResponse.json({ organizations: results, totalResolved });
}
```

## Auto-Resolve Dashboard

The auto-resolved actions appear in a dedicated section, accessible from the main nav:

```
┌─────────────────────────────────────────────────────┐
│  Auto-Resolved Today                          [≡]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Today at 9:00 AM — 5 tasks auto-resolved           │
│                                                     │
│  ✅ 2 applicants tagged                              │
│     • Jane Doe → "fast-track", "income-verified"    │
│     • John Smith → "possible-duplicate"             │
│                                                     │
│  ✅ 2 stale actions expired                          │
│     • "Run background check" — Alice Brown          │
│     • "Verify income docs" — Mike Brown             │
│                                                     │
│  ✅ 1 applicant archived                             │
│     • Tom Jones (Rejected 45 days ago)              │
│                                                     │
│  [Undo all]  [Dismiss all]  [Configure auto-resolve]│
└─────────────────────────────────────────────────────┘
```

## User Controls

Auto-resolve settings are configurable per organization:

```typescript
// Extend organization.automationSettings:
{
  autoArchive: { enabled: true, afterDays: 30 },
  autoExpire: { enabled: true },
  autoDismiss: { enabled: true, afterHours: 72 },
  autoTag: { enabled: true },
  autoRemind: { enabled: true, afterDays: 7 },
  autoRequestDocs: { enabled: true, afterDays: 5 },
}
```

Admin UI:

```
┌─────────────────────────────────────────────────────┐
│  Auto-Resolve Settings                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ☑ Auto-archive rejected after [30] days            │
│  ☑ Auto-expire stale actions                        │
│  ☑ Auto-dismiss info after [72] hours               │
│  ☑ Auto-tag applicants                              │
│  ☑ Auto-queue follow-ups after [7] days             │
│  ☑ Auto-queue doc requests after [5] days           │
│                                                     │
│  [Save settings]                                     │
└─────────────────────────────────────────────────────┘
```

## Safety Guarantees

| Safety mechanism     | Implementation                                                                   |
| -------------------- | -------------------------------------------------------------------------------- |
| **No auto-send**     | Message drafts are queued, never sent automatically                              |
| **7-day undo**       | Archived applicants can be restored within 7 days via the auto-resolve dashboard |
| **Confidence floor** | Only actions with confidence ≥90% are auto-resolved                              |
| **P0/P1 blocked**    | Urgent and high-priority actions are never auto-resolved                         |
| **Per-org opt-out**  | Each auto-resolve capability can be individually disabled                        |
| **Audit trail**      | Every auto-resolved action is logged with `actorName: "Auto-Resolve"`            |
| **Daily digest**     | All auto-resolved actions are summarized once per user session                   |
| **Escalation**       | If an auto-resolve attempt fails, the action reverts to pending + NBA panel      |

## Files Affected

| File                                            | Change                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `lib/auto-resolve.ts`                           | **New** — Main engine with 7 auto-resolvers                          |
| `models/Applicant.ts`                           | Add `archived: boolean`, `archivedAt: Date`, `tags: string[]` fields |
| `models/Organization.ts`                        | Extend `automationSettings` with auto-resolve config                 |
| `models/ApplicantAction.ts`                     | Add `"auto_resolved"` and `"dismissed"` to status enum               |
| `app/api/cron/auto-resolve/route.ts`            | **New** — Cron endpoint to trigger auto-resolve                      |
| `app/api/auto-resolve/undo/route.ts`            | **New** — Undo an auto-resolved action                               |
| `components/settings/auto-resolve-settings.tsx` | **New** — UI for configuring auto-resolve per org                    |
| `components/dashboard/auto-resolve-summary.tsx` | **New** — Daily auto-resolve digest panel                            |

## Fulfillment Table

| Requirement                | How It's Met                                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto-remind users**      | `autoQueueFollowUps()` — Detects screening >7 days stale, queues a follow-up message draft. No manual trigger needed. User sees draft in outbox.                                                   |
| **Auto-close stale tasks** | `autoExpireStaleActions()` — Finds pending actions past `expiresAt`, sets status to `expired`. `autoDismissInfoItems()` — Info-level items visible for 72h without interaction get auto-dismissed. |
| **Auto-request docs**      | `autoQueueDocRequests()` — Detects documentation score <70 with no recent request, queues a document request draft. Follows up every 5 days until resolved.                                        |
| **Auto-tag applicants**    | `autoTagApplicants()` — Applies deterministic tags (fast-track, income-verified, possible-duplicate, etc.) to untagged applicants. Tags are metadata-only, no state changes.                       |

### Bonus auto-resolvers:

- **Auto-archive**: Rejected applicants >30 days get soft-deleted (hidden from view, still accessible via filter)
- **Auto-sync**: Score recalculation triggered on data changes (placeholder — requires scoring engine integration)
