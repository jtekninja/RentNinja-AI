# Mobile AI Workflows — Design Document

## Overview

Property managers live on phones. The current desktop dashboard — when squeezed into a mobile viewport — requires two-thumb scrolling, dense text scanning, and multiple taps to accomplish anything. This design reimagines the mobile experience as a **thumb-first, notification-driven, swipe-to-act** interface that surfaces AI insights, NBA actions, and applicant decisions in under 2 seconds.

## Design Principles

1. **One thumb, everything** — Every action must be reachable with the thumb on a 6.1" screen. No two-handed operations. No pinch-to-zoom. No hover states.
2. **2-second glance** — The home screen shows the most important thing (urgent count + top action) in under 2 seconds. No scrolling required for the critical signal.
3. **Swipe to act** — Accept, skip, override, approve, and reject are all swipe gestures. Tapping is for viewing detail. Swiping is for acting.
4. **Push notifications are the primary entry point** — The user doesn't open the app to check for issues. The app pushes urgent items as notifications. Tapping the notification opens directly to the action.
5. **AI summary is the default view** — Numbers are hidden behind "Show details". The default mobile view is a natural language summary: "2 urgent, 3 actions. Jane needs inspection follow-up."
6. **Offline-capable** — The most recent AI summary and pending actions are cached locally. The app is usable (view-only) without a network connection.

## Current Mobile State (Desktop App Squeezed)

The existing mobile experience has:

- `mobileSection` state toggling between Overview, New, Billing, All — clunky, requires conscious navigation
- Sidebar drawer with hamburger menu — hidden affordance, extra tap
- Full applicant cards (800px detail) in a narrow viewport — endless scroll
- SummaryCards grid squeezed to 2 columns — illegible numbers
- ActionPanel still requires 3 taps to reveal
- No swipe gestures
- No push notifications

## Proposed Mobile Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Mobile App Shell                    │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  Tab Bar (always visible, thumb-reachable)     │   │
│  │  [Inbox] [Pipeline] [Search] [Copilot] [Menu] │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  Primary Content Area                          │   │
│  │  (varies by tab)                                │   │
│  │                                                 │   │
│  │  Inbox Tab (default):                           │   │
│  │  ┌────────────────────────────────────────┐   │   │
│  │  │ 🔴 2 urgent · 🟡 3 actions            │   │   │
│  │  ├────────────────────────────────────────┤   │   │
│  │  │ ← Failed inspection — Jane Doe    ✓   │   │   │
│  │  │ ← Risk move-in 3d — John Smith    ✓   │   │   │
│  │  │ → 3 stale in screening            ✓   │   │   │
│  │  │ → 2 ready to approve              ✓   │   │   │
│  │  └────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  Bottom Sheet (swipe up for detail)            │   │
│  │  "Jane Doe — Failed inspection"                 │   │
│  │  ┌────────────────────────────────────────┐   │   │
│  │  │ Score: 72/100 · Status: Screening     │   │   │
│  │  │ Rule: inspection_status === "Failed"  │   │   │
│  │  │ [Schedule re-inspection] [Dismiss]   │   │   │
│  │  └────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## Tab Bar Design

The bottom tab bar is the primary navigation — always visible, always thumb-reachable:

| Tab          | Icon | Content                                                                                                 |
| ------------ | ---- | ------------------------------------------------------------------------------------------------------- |
| **Inbox**    | 📥   | Priority feed: urgent items, actions, auto-resolve summary. Default tab. Badge count for total pending. |
| **Pipeline** | 📋   | Compact applicant list with AI summaries. Pull-to-refresh.                                              |
| **Search**   | 🔍   | Universal search: type a name, property, or natural language query.                                     |
| **Copilot**  | 🤖   | Quick-access AI assistant with voice input (microphone button).                                         |
| **Menu**     | ≡    | Settings, admin, billing, archived, sign out.                                                           |

## Screen Designs

### 1. Inbox Tab (Default — 2-second glance)

```
┌──────────────────────────────────────────────────────┐
│                              📥 Inbox          [≡]   │
│                                                        │
│  🔴 2 urgent · 🟡 3 actions · Pipeline healthy       │
│                                                        │
│  ── Today ─────────────────────────────────────────    │
│                                                        │
│  ← Failed inspection — Jane Doe                   ✓   │
│    Inspection: Failed · Status: Screening             │
│    14 days overdue                                    │
│                                                        │
│  ← Risk move-in 3d — John Smith                  ✓   │
│    Decision: Risk · Score: 45/100                     │
│    Move-in: May 12                                     │
│                                                        │
│  → 3 stale in screening                           ✓   │
│    7-14 days without update                           │
│                                                        │
│  → 2 ready to approve                             ✓   │
│    Both Strong with no red flags                       │
│                                                        │
│  ── Auto-Resolved ────────────────────────────────    │
│                                                        │
│  ✓ 2 applicants tagged · 1 action expired             │
│  [Tap to review]                                       │
│                                                        │
├──────────────────────────────────────────────────────┤
│  [Inbox] [Pipeline] [🔍] [🤖] [≡]                    │
└──────────────────────────────────────────────────────┘
```

**Key behaviors:**

- Each row is a single thumb-swipeable card (≈60px tall)
- Swipe RIGHT → Accept / Mark complete
- Swipe LEFT → Dismiss / Skip
- Tap → Bottom sheet with full details
- Long press → Quick action menu (Override, Schedule, Message)
- Badge on Inbox tab shows total count of urgent + actions

### 2. Swipe-to-Act Gestures

```
┌──────────────────────────────────────────────────────┐
│                                                        │
│  Swipe Right → Accept                                  │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ ✓ Accept                                    ←  │   │
│  │ Failed inspection — Jane Doe                    │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  Swipe Left → Dismiss                                  │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ →  3 stale in screening                    ✕  │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  Full swipe → Execute immediately                      │
│  Partial swipe → Show action label, must complete      │
│                                                        │
│  Haptic feedback on action completion                  │
│  Undo banner appears for 5 seconds after action        │
│                                                        │
└──────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// Swipe config for react-use-gesture or similar
const SWIPE_THRESHOLD = 80; // px — thumb distance for full action

function handleSwipe(direction: "left" | "right", item: ActionItem) {
  if (direction === "right") {
    // Accept — mark as complete
    acceptAction(item.id);
    showUndoBanner(`Accepted: ${item.title}`);
  } else {
    // Dismiss — skip
    skipAction(item.id);
    showUndoBanner(`Dismissed: ${item.title}`);
  }
}

function showUndoBanner(message: string) {
  // Show for 5 seconds
  toast(message, {
    action: { label: "Undo", onClick: () => undoLastAction() },
    duration: 5000,
  });
}
```

### 3. Bottom Sheet — Applicant Detail (One-thumb)

```
┌──────────────────────────────────────────────────────┐
│  ═══════ drag handle ═══════                          │
│                                                        │
│  Jane Doe                                              │
│  jane@email.com  ·  +1 (555) 0100                     │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │  72/100  [Review]  Screening · 10 days         │   │
│  │  Affordability: 2.8x  ·  Income: $8,000/mo     │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ⚠ 2 red flags                                        │
│  • Income docs below threshold                         │
│  • Screening score pending                             │
│                                                        │
│  ✅ 2 green flags  [Show details ▾]                    │
│                                                        │
│  Actions:                                               │
│  ┌────────────────────────────────────────────────┐   │
│  │  ✓ Accept  [Run background check]              │   │
│  ├────────────────────────────────────────────────┤   │
│  │  ↪ Skip                                        │   │
│  ├────────────────────────────────────────────────┤   │
│  │  ↻ Override  [Enter reason...]                 │   │
│  ├────────────────────────────────────────────────┤   │
│  │  ✉ Send message  [Follow-up] [Request docs]   │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  [View full profile →]                                 │
└──────────────────────────────────────────────────────┘
```

**One-thumb design:**

- Bottom sheet starts at 40% of screen height (shows summary + score)
- Swipe up expands to 80% (shows actions)
- All action buttons are in the bottom third — thumb reachable
- Drag handle at top — easy to dismiss
- Haptic feedback on pull

### 4. Pipeline Tab — Compact Applicant List

```
┌──────────────────────────────────────────────────────┐
│                          📋 Pipeline          [≡]   │
│                                                        │
│  [+ Add]  [Filter: Review ▼]  [Sort: Priority ▼]     │
│                                                        │
│  ────────────────────────────────────────────────      │
│                                                        │
│  Jane Doe                 72/100  [Review]  ⚠   →    │
│  ⚠ Income docs missing · Screening 10d stale          │
│                                                        │
│  John Smith              45/100  [Risk]    ⚠   →    │
│  🔴 Move-in in 3 days — expedite review               │
│                                                        │
│  Alice Brown             88/100  [Strong]       →    │
│  ✅ All clear — ready to approve                       │
│                                                        │
│  Mike Brown              85/100  [Strong]       →    │
│  ✅ Fast-track eligible                                 │
│                                                        │
│  Lisa Wang               78/100  [Review]       →    │
│  ✅ Income verified, docs pending                      │
│                                                        │
├──────────────────────────────────────────────────────┤
│  [Inbox] [Pipeline] [🔍] [🤖] [≡]                    │
└──────────────────────────────────────────────────────┘
```

**Key behaviors:**

- Each row is ≈70px — fits 5-6 on screen
- AI-generated 1-line summary replaces raw metrics
- Tap row → Bottom sheet with full detail
- Color-coded left border (red=urgent, amber=action, green=ok)
- "→" indicates tappable, swipeable

### 5. Search Tab — Universal Search with AI

```
┌──────────────────────────────────────────────────────┐
│                           🔍 Search                  │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ 🔍 Search applicants, properties, or ask AI   │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  ── Quick Actions ────────────────────────────────     │
│                                                        │
│  [What's urgent?]  [Show Jane's risk]  [Compare all] │
│                                                        │
│  ── Recent ───────────────────────────────────────     │
│                                                        │
│  Jane Doe — Viewed 2m ago                              │
│  John Smith — Viewed 15m ago                           │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ 🎤 Tap to speak your query                    │   │
│  └────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────┤
│  [Inbox] [Pipeline] [🔍] [🤖] [≡]                    │
└──────────────────────────────────────────────────────┘
```

**Search results example:**

```
User types: "risky applicants"
Result: 4 applicants flagged as Risk or elevated risk:
1. John Smith — 45/100, move-in 3 days
2. Tom Jones — 52/100, rental history weak
3. ...
```

### 6. Copilot Tab — Voice-First AI Assistant

```
┌──────────────────────────────────────────────────────┐
│                        🤖 Copilot                    │
│                                                        │
│  ┌────────────────────────────────────────────────┐   │
│  │ 🎤 Listening...                            ⏹  │   │
│  └────────────────────────────────────────────────┘   │
│                                                        │
│  Or type your question...                               │
│                                                        │
│  ── Suggestions ──────────────────────────────────     │
│                                                        │
│  [What needs my attention?]                            │
│  [Tell me about Jane Doe]                              │
│  [Who should I approve?]                               │
│  [How is my pipeline this week?]                       │
│                                                        │
│  ── Last query ───────────────────────────────────     │
│                                                        │
│  You: "What's urgent?"                                 │
│  Copilot: "2 urgent items: Jane Doe's failed           │
│  inspection (14 days) and John Smith's move-in         │
│  in 3 days with Risk score 45/100."                   │
│                                                        │
│  [Show in inbox] [Dismiss]                             │
├──────────────────────────────────────────────────────┤
│  [Inbox] [Pipeline] [🔍] [🤖] [≡]                    │
└──────────────────────────────────────────────────────┘
```

**Voice-first design:**

- Microphone button is the primary input — always visible, always listening when tapped
- Voice results appear as text with action buttons
- "Tap to speak" replaces keyboard for one-thumb operation
- Results are concise (2-3 sentences) — no scrolling required

## Notification-Driven Actions

### Notification Types

| Notification                                     | Trigger                             | Priority                             | Action on Tap                                    |
| ------------------------------------------------ | ----------------------------------- | ------------------------------------ | ------------------------------------------------ |
| "Jane Doe's inspection failed — 14 days overdue" | NBA rule: `failed_inspection_stuck` | P0 — Critical alert (sound + banner) | Opens bottom sheet with schedule/resolve actions |
| "John Smith's move-in is in 3 days"              | NBA rule: `expedite_risk_review`    | P0 — Critical alert                  | Opens bottom sheet with expedite action          |
| "3 applicants stuck in screening"                | NBA rule: `followup_screening`      | P1 — Silent notification             | Opens inbox tab filtered to stale items          |
| "2 applicants ready for fast-track approval"     | Green flag detection                | P1 — Silent notification             | Opens pipeline tab filtered to strong            |
| "Auto-resolved: 5 tasks completed"               | Auto-resolve engine (daily)         | P2 — Summary notification            | Opens auto-resolve digest                        |
| "Jane Doe's screening report received"           | Data change event                   | P2 — Silent notification             | Updates card silently, no alert                  |

### Notification Flow

```
[System detects urgent issue]
        │
        ▼
[Check user preferences: notification enabled?]
        │
        ├─ P0 → Push notification with sound + vibration
        │       Tap → Opens app directly to action bottom sheet
        │       "Jane Doe — Failed inspection"
        │       "Action: Schedule re-inspection or mark as Rejected"
        │
        ├─ P1 → Silent push notification (banner only, no sound)
        │       Tap → Opens inbox tab
        │       "3 applicants stuck in screening"
        │
        └─ P2 → Badge count update only
                "Auto-resolved: 5 tasks ✓"
```

### Notification Preferences (Per-User)

```
Push notifications:
  ☑ Urgent issues (P0) — Always
  ☑ Action items (P1) — Weekdays 8am-8pm
  ☐ Auto-resolve digest — Daily at 9am
  ☐ Marketing / product updates — Never

Quiet hours: 10:00 PM → 7:00 AM
  (P0 still breaks through with sound)
```

## One-Thumb Workflow Examples

### Workflow 1: Morning Pipeline Review (15 seconds)

```
1. Notification: "3 urgent items" → Tap
2. Inbox opens → Shows P0 items
3. Swipe right on "Failed inspection — Jane" → Accept
4. Haptic buzz → "Scheduled re-inspection" toast
5. Swipe left on "Info: Archive Tom" → Dismiss
6. Tap "3 stale screening" → Bottom sheet
7. Tap "Send follow-ups" → Queued
Total: 15 seconds, right thumb only, never left the inbox
```

### Workflow 2: Quick Approve Qualified Applicant (10 seconds)

```
1. Open app → Inbox shows "2 ready to approve"
2. Tap item → Bottom sheet with Alice Brown
3. Swipe right on "Approve Alice" → Done
4. Haptic buzz → "Approved: Alice Brown" toast
5. Undo banner appears for 5 seconds
Total: 10 seconds, 1 swipe, 1 tap
```

### Workflow 3: Voice Query While Walking (5 seconds)

```
1. Tap Copilot tab
2. Tap microphone → "Who should I approve today?"
3. AI responds: "Alice Brown (88/100) and Mike Brown (85/100)"
4. Tap "Approve Alice" → Done
Total: 5 seconds, 3 taps, 1 voice command
```

### Workflow 4: Handle Urgent Issue from Notification (8 seconds)

```
1. Lock screen notification: "John Smith — Risk move-in 3 days"
2. Force touch / long press → Quick actions: [Expedite review] [View]
3. Tap "Expedite review"
4. Confirm → Action logged
Total: 8 seconds, never "opened" the app
```

## Push Notification Payload

```typescript
interface NotificationPayload {
  title: string;
  body: string;
  priority: "P0" | "P1" | "P2";
  sound: boolean; // true for P0
  data: {
    screen: "inbox" | "pipeline" | "applicant";
    actionId?: string;
    applicantId?: string;
    actionType?: "accept" | "skip" | "view";
    deepLink: string; // e.g., "rentninja://applicant/abc123/actions"
  };
}
```

**Deep link examples:**

- `rentninja://inbox` — Opens inbox tab
- `rentninja://applicant/:id` — Opens applicant bottom sheet
- `rentninja://applicant/:id/actions` — Opens applicant action sheet
- `rentninja://pipeline?filter=urgent` — Opens filtered pipeline
- `rentninja://copilot` — Opens copilot with microphone active

## Mobile-Specific API Endpoints

### GET /api/mobile/summary

Returns a mobile-optimized summary — everything the inbox tab needs in one call:

```json
{
  "urgentCount": 2,
  "actionCount": 3,
  "autoResolvedCount": 5,
  "pipelineSummary": "24 applicants · 72 avg · ↑3% WoW",
  "topItems": [
    {
      "id": "action_123",
      "type": "urgent",
      "title": "Failed inspection — Jane Doe",
      "subtitle": "14 days overdue",
      "priority": "P0",
      "swipeRightLabel": "Accept",
      "swipeLeftLabel": "Dismiss"
    }
  ],
  "autoResolved": [
    {
      "action": "tag_applicant",
      "applicant": "Jane Doe",
      "detail": "fast-track, income-verified"
    }
  ]
}
```

### PATCH /api/mobile/action/:id/swipe

Process a swipe action:

```json
// Request:
{ "direction": "right", "actionType": "accept" }

// Response:
{ "success": true, "undoable": true, "undoExpiry": "2026-05-09T12:00:00Z" }
```

## Files Affected (New & Modified)

| File                                         | Change                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| `components/mobile/inbox-tab.tsx`            | **New** — Swipeable inbox feed with priority grouping        |
| `components/mobile/pipeline-tab.tsx`         | **New** — Compact applicant list with AI summaries           |
| `components/mobile/search-tab.tsx`           | **New** — Universal search + quick actions                   |
| `components/mobile/copilot-tab.tsx`          | **New** — Voice-first AI assistant                           |
| `components/mobile/bottom-sheet.tsx`         | **New** — Reusable draggable bottom sheet with haptics       |
| `components/mobile/swipeable-row.tsx`        | **New** — Gesture-enabled swipe row with action labels       |
| `components/mobile/tab-bar.tsx`              | **New** — Bottom tab bar with badge counts                   |
| `components/mobile/applicant-sheet.tsx`      | **New** — Applicant detail in bottom sheet format            |
| `components/mobile/notification-handler.tsx` | **New** — Push notification tap handling + deep linking      |
| `app/api/mobile/summary/route.ts`            | **New** — Mobile-optimized summary endpoint                  |
| `app/api/mobile/swipe/[actionId]/route.ts`   | **New** — Process swipe gesture actions                      |
| `lib/push-notifications.ts`                  | **New** — Push notification dispatch + preference management |
| `app/dashboard/page.tsx`                     | Detect mobile vs desktop → render appropriate shell          |

## Performance Targets

| Metric                     | Target                         |
| -------------------------- | ------------------------------ |
| Inbox tab load (full)      | < 1.0s on 4G                   |
| Inbox tab load (cached)    | < 200ms (offline)              |
| Swipe action confirm       | < 300ms                        |
| Bottom sheet open          | < 100ms (native feel)          |
| Copilot voice response     | < 2s (including AI generation) |
| Push notification delivery | < 5s from trigger              |
| App cold start to usable   | < 2s                           |

## Comparison: Current Mobile vs. Proposed

| Aspect            | Current (Desktop Squeezed)                  | Proposed (Mobile-First)                 |
| ----------------- | ------------------------------------------- | --------------------------------------- |
| Navigation        | Hamburger menu + section tabs               | Bottom tab bar, always visible          |
| Actions           | 3 taps to reveal, then tap                  | Swipe right/left, one motion            |
| Applicant detail  | Full card, 800px scroll                     | Bottom sheet, 40-80% screen             |
| AI summary        | Not available                               | Default view on every tab               |
| Search            | Text field + dropdowns                      | Universal search + AI + voice           |
| Notifications     | None                                        | P0 pushes with deep links               |
| Voice input       | Not supported                               | Microphone on Copilot tab               |
| Offline support   | None                                        | Cached summary + actions                |
| One-thumb usable  | No — requires two hands                     | Yes — all actions in thumb zone         |
| Time to act on P0 | 30+ seconds (open app, scroll, toggle, tap) | 8 seconds (notification → quick action) |

## Fulfillment Table

| Requirement                     | How It's Met                                                                                                                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Swipe approve/reject**        | `swipeable-row.tsx` — Swipe right = accept, swipe left = dismiss/skip. Haptic feedback on completion. 5-second undo banner.                                                                                                                        |
| **Quick AI summaries**          | `GET /api/mobile/summary` returns natural language headlin + top 5 items. Pipeline tab shows AI-generated 1-line per applicant. Copilot tab provides voice-accessible summaries.                                                                   |
| **One-thumb workflows**         | Bottom tab bar in thumb zone. Swipe gestures require no precision tapping. Bottom sheet actions in lower third. Voice input on Copilot tab replaces keyboard. All workflows demonstrated in 5-15 seconds.                                          |
| **Notification-driven actions** | P0 notifications with sound + deep links. Force touch / long press for quick actions without opening app. Notification preferences per user with quiet hours. Deep links: `rentninja://inbox`, `rentninja://applicant/:id`, `rentninja://copilot`. |
