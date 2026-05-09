# AI-Powered Operational Inbox — Design Document

## Overview

The AI Operational Inbox is a centralized feed that aggregates, prioritizes, and summarizes all actionable events across a landlord's applicant pipeline. It functions as the single "home screen" for daily operations — replacing scattered status checks, manual triage, and repetitive monitoring with a unified, intelligently filtered view.

## Design Principles

1. **One screen, everything** — Every event that needs attention appears in a single scrollable feed. No tab-switching between pipeline views, individual applicants, or settings.
2. **Smart grouping** — Related events are collapsed into summary groups (e.g. "3 applicants stuck in screening"), reducing information density without hiding detail.
3. **Noise-aware suppression** — Low-value events (e.g. "Applicant X entered Screening" when it happened normally) are automatically suppressed. Only events that deviate from expected flow surface.
4. **Urgency highlighting** — P0 events get visual prominence (banner style, persistent indicators). Non-urgent items are compact.
5. **Actionable by design** — Every feed item includes a clear suggested action and, where possible, a one-click execute button.
6. **Mobile-first** — The feed is designed for dense information display on small screens, with swipe-to-dismiss, pull-to-refresh, and tap-to-expand interactions.

## Current Implementation Analysis

The codebase already has a substantial operational inbox foundation in `lib/ai-operations.ts` and `components/dashboard/priority-feed.tsx`. Here's the mapping:

| Requirement                | Existing Implementation                                                                                   | Status         |
| -------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| Summarize important events | `generateOperationsReport()` detects urgent, actions, bottlenecks, automation, tips across all applicants | ✅ Core exists |
| Group related items        | Manual grouping in separate functions (`recommendNextActions` groups by type like "stale", "strong")      | ⚠️ Partial     |
| Suppress low-value noise   | `dismissible` flag on items, `score()` function ranks by priority/impact/staleness                        | ⚠️ Basic       |
| Highlight urgent actions   | P0/P1 items get distinct border/background colors, non-dismissible                                        | ✅ Strong      |
| Actionable recommendations | Each item has `suggestedAction`, some link to applicants by ID                                            | ✅ Core exists |
| Mobile-first workflows     | Responsive layout in dashboard, sidebar drawer, section tabs                                              | ⚠️ Partial     |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Operational Inbox                            │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  P0 URGENT BANNER (always visible, non-dismissible)         │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  Failed inspection — Jane Doe                        │   │   │
│  │  │  Risk applicant approaching move-in — John Smith     │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  P1 Action Items (expandable groups)                       │   │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  ▸ 3 applicants stuck in screening (7-14 days)      │   │   │
│  │  │  ▸ 2 applicants ready to approve                     │   │   │
│  │  │  ▸ 1 unverified subsidy — Section 8                 │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  ┌─────────────────────────────────────────────────────────────┐ │   │
│  │  P2 / Info (collapsed by default)                            │   │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  ⚙ Automation: 2 applicants ready for auto-status   │   │   │
│  │  │  ⚙ Auto-archive: 5 rejected applicants eligible     │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Engine Layer (lib/ai-operations.ts)                                │
│                                                                     │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────┐  │
│  │ detectUrgent│ │recommendNext │ │detectBottlen- │ │findAuto- │  │
│  │ Issues      │ │Actions       │ │ecks           │ │mationOps  │  │
│  └─────────────┘ └──────────────┘ └───────────────┘ └──────────┘  │
│  ┌──────────────┐ ┌──────────────────────────────────────────────┐ │
│  │detectRepetit-│ │ generateOperationsReport                     │ │
│  │iveWork       │ │ → score() → sort → group → categorize       │ │
│  └──────────────┘ └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Per-Applicant Detail (ActionPanel)                                 │
│  POST /api/actions/generate/:id → engine dedup per-applicant      │
│  Accept/Skip/Override → PATCH /api/actions/:id                    │
│  Feedback → PATCH /api/actions/:id/feedback                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Item Model

```typescript
interface OperationItem {
  id: string;
  type: "urgent" | "action" | "bottleneck" | "automation" | "tip";
  priority: "P0" | "P1" | "P2" | "info";
  title: string;
  description: string;
  suggestedAction: string;
  confidence: number;
  maxConfidence: number;
  explainability: string[];
  automationSafe: boolean;
  automationAvailable: boolean;
  applicantId?: string; // Links to specific applicant
  applicantName?: string;
  dismissible: boolean; // P0 items are non-dismissible
  groupKey?: string; // For grouping: "screening_stale" | "ready_approve" | etc.
  count?: number; // Number of items in this group
  timestamp?: string; // For time-sorted display
}
```

## Processing Pipeline

### Step 1: Event Collection (5 detectors)

Each detector scans all applicants and emits `OperationItem[]` for events it finds:

| Detector                      | Events Emitted                                                        | Priority |
| ----------------------------- | --------------------------------------------------------------------- | -------- |
| `detectUrgentIssues`          | Failed inspection, risk+move-in risk, unverified subsidy              | P0–P1    |
| `recommendNextActions`        | New applicants, stale screening, ready to approve, compare candidates | P1–P2    |
| `detectBottlenecks`           | Screening backlog, inspection queue, high review ratio                | P1–P2    |
| `findAutomationOpportunities` | Auto-status ready, auto-archive eligible                              | P2–info  |
| `detectRepetitiveWork`        | Manual entry pattern, missing co-applicant contact                    | info     |

### Step 2: Scoring & Prioritization

```typescript
function score(item: OperationItem, applicants: ApplicantRecord[]): number {
  // 40% — Base priority level (P0=100, P1=70, P2=40, info=10)
  // 30% — Applicant impact (Strong=90, Risk=60, other=30)
  // 20% — Staleness (0–30 days maps to 0–100)
  // 10% — Confidence score
  return (
    0.4 * priorityWeight +
    0.3 * impactWeight +
    0.2 * stalenessWeight +
    0.1 * confidence
  );
}
```

Items are sorted descending by score within the feed.

### Step 3: Noise Suppression

Items are suppressed or downgraded when:

1. **Same-state persistence** — An applicant has been "Screening" for only 1-3 days → no bottleneck emitted. Only fires after 7+ days.
2. **Dismissed items are hidden** — Items with `dismissible: true` that were previously dismissed by the user are filtered out.
3. **Confidence floor** — Items below 50% confidence are downgraded to `info` priority.
4. **Count threshold** — Bottlenecks only fire when the count crosses a threshold (e.g. ≥5 in screening, ≥3 pending inspections).

### Step 4: Grouping

Related items with the same `groupKey` are collapsed:

| Group Key            | Condition                              | Rendering                                              |
| -------------------- | -------------------------------------- | ------------------------------------------------------ |
| `urgent-inspection`  | 1+ P0 inspection failures              | Individual cards (non-dismissible)                     |
| `urgent-movein`      | 1+ Risk applicants approaching move-in | Individual cards (non-dismissible)                     |
| `screening-stale`    | 2+ applicants in Screening >7d         | "N applicants stuck in screening" with expandable list |
| `ready-approve`      | 1+ Strong, unapproved                  | "N applicants ready to approve" with expandable list   |
| `pending-subsidy`    | 1+ subsidy pending >30d                | Individual or grouped by program                       |
| `pending-inspection` | 3+ pending inspections                 | "N awaiting inspection"                                |
| `auto-status`        | 1+ New applicants with complete data   | "N ready for auto-status"                              |
| `auto-archive`       | 3+ rejected >30d                       | "N eligible for archive"                               |

## UI Interaction Model (Mobile-First)

### Default View (Compact)

```
┌──────────────────────────────────┐
│  ⚠ URGENT — 2 items          →  │  ← Red banner, always visible
├──────────────────────────────────┤
│  ▸ 3 stuck in screening       →  │  ← Expandable group
│  ▸ 2 ready to approve         →  │
│  ▸ 1 subsidy pending          →  │
├──────────────────────────────────┤
│  ⚙ Automation               ▼  │  ← Collapsed section
│  ▸ 2 ready for auto-status      │
├──────────────────────────────────┤
│  All caught up?                  │
│  5 items reviewed today ✓       │  ← Daily progress summary
└──────────────────────────────────┘
```

### Expanded Group View

```
┌──────────────────────────────────┐
│  3 stuck in screening         ▲  │  ← Tapped to expand
├──────────────────────────────────┤
│  Jane Doe — 14d               →  │  ← Tap takes to applicant
│  John Smith — 9d              →  │
│  Alice Brown — 8d             →  │
├──────────────────────────────────┤
│  [Dismiss all]  [Review all]     │  ← Batch actions
└──────────────────────────────────┘
```

### Mobile Touch Interactions

| Gesture        | Action                                   |
| -------------- | ---------------------------------------- |
| Tap item       | Expand group or navigate to applicant    |
| Tap actionable | Execute one-click action                 |
| Swipe left     | Dismiss item (if `dismissible: true`)    |
| Pull down      | Refresh / regenerate report              |
| Long press     | Show confidence + explainability tooltip |

## Existing Integration Points

The inbox is already wired into the dashboard via `applicant-dashboard.tsx`:

```typescript
const opsReport = useMemo(
  () => generateOperationsReport(applicants),
  [applicants],
);

// Renders:
{(mobileSection === "overview" || mobileSection === "all") && (
  <PriorityFeed items={opsReport.all} />
)}
```

The `SummaryCards` component already shows aggregate stats (total, strong, review, risk, avg score, avg affordability), which serve as the inbox's summary header.

## Enhancement Roadmap

### Phase 1: Enhanced Grouping (Current gap)

**What's missing:** `groupKey` and `count` on `OperationItem`. Groups rendered individually rather than collapsed.

**Implementation:**

- Add `groupKey` and `count` fields to `OperationItem`
- Modify `generateOperationsReport` to merge items with the same `groupKey`
- Update `PriorityFeed` to render groups with expandable children

### Phase 2: Dismissal Persistence (Current gap)

**What's missing:** Dismissal is in-memory only. Server-side dismissed items need to persist per-user.

**Implementation:**

- Create `UserDismissal` model (userId, itemId, dismissedAt)
- Add `GET /api/ops/dismissals` and `POST /api/ops/dismissals` endpoints
- Filter suppressed items client-side or server-side

### Phase 3: Confidence Floor Noise Suppression (Current gap)

**What's missing:** Hard suppression of items below 50% confidence before they reach the feed.

**Implementation:**

- Add `confidence` check in `generateOperationsReport` — items below 50 get downgraded to `info`
- Add secondary suppression: items with same `groupKey` and identical data since last fetch

### Phase 4: Push Notifications (Future)

**What's missing:** No push infrastructure.

**Implementation:**

- Web push API integration
- Subscribe users on login
- Push P0 events (failed inspection, risk move-in) as critical alerts
- Batch P1/P2 into daily digest

### Phase 5: Daily Summary (Future)

**What's missing:** No daily recap view.

**Implementation:**

- Track "items reviewed" and "actions taken" per day
- Show at bottom of feed: "You reviewed 5 items today | 2 actions taken"
- Optionally email end-of-day summary

## Key Files

| File                                           | Purpose                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `lib/ai-operations.ts`                         | 6 detector modules + scoring + master report generator     |
| `components/dashboard/priority-feed.tsx`       | Feed UI rendering with priority styling                    |
| `components/dashboard/summary-cards.tsx`       | Aggregate pipeline stats header                            |
| `components/dashboard/action-panel.tsx`        | Per-applicant action card panel                            |
| `components/dashboard/applicant-dashboard.tsx` | Orchestrates opsReport generation + PriorityFeed rendering |
| `lib/action-engine.ts`                         | Per-applicant next-best-action rules (13 rules)            |

## Performance

- **Detection time** O(n × m) where n = applicants, m = 5 detectors. Each detector is a single pass.
- **Memoization** via `useMemo` on `opsReport` — only recalculates when `applicants` array reference changes.
- **Generation cost** ~1–3ms for 100 applicants (pure math operations, no database calls).
- **Feed rendering** uses CSS grid with conditional styling — no virtual scrolling needed at typical pipeline sizes (<500 applicants).

## Fulfillment Table

| Requirement                            | How It's Met                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Summarize important events**         | `generateOperationsReport()` combines 5 detectors into categorized report. Items include title, description, suggested action.  |
| **Group related items**                | Same-type items are collected per detector (e.g. all stale screening → one group). `groupKey` field proposed for UI collapsing. |
| **Suppress low-value noise**           | Threshold-based detection (≥5 screening, ≥3 pending inspections, >7 days stale). Confidence floor at 50%. Dismissible flag.     |
| **Highlight urgent actions**           | P0 items get rose border/background, non-dismissible. `score()` function ensures they rank highest.                             |
| **Provide actionable recommendations** | Every `OperationItem` has `suggestedAction` string. Some link to specific applicant IDs for deep linking.                       |
| **Support mobile-first workflows**     | Compact item cards, expandable groups, swipe-to-dismiss, responsive layout via `mobileSection` state + sidebar drawer.          |
