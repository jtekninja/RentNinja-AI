# Cognitive Overload Audit — Review & Recommendations

## Executive Summary

The RentNinja dashboard has powerful AI capabilities beneath the surface, but the current UI layers them behind a visually dense, text-heavy interface that forces the landlord to manually triage, interpret, and navigate. The core insight: **the dashboard makes the user work to find what the AI already knows.**

Current flow requires the user to:

1. Scan summary cards (6 numbers with no context)
2. Read the priority feed (5 categories, 20+ items)
3. Scroll through applicant cards (potentially 50+)
4. Click each applicant to reveal action panels
5. Click "Generate" to see NBA actions
6. Read, decide, and act

A calmer AI-first experience would:

- Show the most important thing FIRST (1 urgent item, not 6 summary cards)
- Act on behalf of the user where safe (auto-status, auto-archive)
- Explain decisions in context (inline, not behind clicks)
- Eliminate redundant scanning by surfacing the AI's prioritized output as the primary interface

## Finding 1: Excessive Clicks — Action Panel Requires 3 Clicks to Reveal

**Problem:** The NBA action panel is hidden behind a toggle per applicant. The user must:

1. Scroll to find the applicant
2. Click the "+" toggle
3. Wait for the API call to generate actions
4. Read the action card
5. Click Accept/Skip/Override

**Where:** `applicant-list.tsx` line 520–534, `action-panel.tsx` line 48–84

**Impact:** For a pipeline of 20 applicants with 3 having urgent actions, the user must manually scan all 20, click 3 toggles, wait 3 API calls, then act. That's at least 6 clicks + waiting time before any action takes place.

**Recommendation — AI-first fix:**

- Auto-expand the action panel for any applicant with P0 or P1 actions
- Show a red dot indicator on the applicant card when actions exist
- Batch-generate actions for all applicants on dashboard load (server-side), not on-demand per applicant
- Place an "Action required" banner at the top of each applicant card for urgent items, eliminating the need to toggle

```typescript
// Instead of: expanded={expandedActionIds.has(applicant._id)}
// Use: expanded={hasUrgentAction(applicant._id)}
// This auto-shows P0/P1 actions without user click
```

## Finding 2: Noisy UI — 6 Summary Cards with No Prioritization

**Problem:** The `SummaryCards` component displays 6 static numbers with equal visual weight — even when all values are normal. "Total Applicants: 24" is shown with the same prominence as "Risk Cases: 4" when the risk cases are the actually important signal.

**Where:** `components/dashboard/summary-cards.tsx` lines 15–46, `applicant-dashboard.tsx` line 411

**Impact:** The user's eyes must scan 6 cards to find the 1 that matters. When all values are within normal range, the cards provide zero actionable information but still consume prime screen real estate and visual attention.

**Recommendation — AI-first fix:**

- Replace static summary cards with a single "Smart Summary" line: "24 applicants · 4 urgent · 3 stale · Pipeline healthy"
- Move detailed statistics into an expandable "Details" section
- Color-code only values that deviate from expected range (anomaly detection)
- Use the anomaly detection from the portfolio insights system to suppress normal values entirely

```typescript
// Instead of always rendering 6 cards:
if (allWithinNormalRange) {
  return <SmartSummaryLine>{total} applicants · All metrics normal</SmartSummaryLine>;
}
// Only expand to detailed cards when anomalies exist
```

## Finding 3: Poor Prioritization — Everything Is Equally Visible

**Problem:** The page layout renders in this fixed order:

1. Header (hero text — 200px of visual space, rarely useful after first visit)
2. SummaryCards (6 cards)
3. PriorityFeed (if overview tab — variable length, often 10+ items)
4. Applicant filters (search, 3 dropdowns, sort, AI compare button)
5. ApplicantList (all applicants, each 800+px tall with full detail)

**Where:** `applicant-dashboard.tsx` lines 278–632

**Impact:** The P0 urgent items (failed inspection, risk move-in) are buried below the hero section and summary cards. On a 1920×1080 screen, the user sees the header and 6 metric cards above the fold — NOT the urgent items. They must scroll past ~400px of non-urgent content to reach the priority feed.

**Recommendation — AI-first fix:**

- **Invert the layout order:** Urgent banner → Priority feed (condensed) → Pipeline section → Details
- Reduce the hero header to a single line after first visit (stored in UserPreferences)
- Move the ApplicantForm to a modal triggered by a "+" button, not always visible in the sidebar
- Show only the top 3 priority items in the feed by default, with a "Show all" expand

```
┌─────────────────────────────────────────────────────────┐
│ 🔴 2 urgent items · 🟡 3 actions · 🟢 Pipeline healthy │
├─────────────────────────────────────────────────────────┤
│ [Urgent: Failed inspection — Jane] [Risk move-in — John]│
├─────────────────────────────────────────────────────────┤
│ ⚡ Quick actions: 3 stale in screening ─ [Send follow-up]│
├─────────────────────────────────────────────────────────┤
│ [+ Add applicant]  🔍 [Search...]  [Filter ▼] [Sort ▼] │
│ Applicant cards (condensed view, expand on click)...     │
└─────────────────────────────────────────────────────────┘
```

## Finding 4: Repetitive Workflows — Applicants Reveal the Same Information Twice

**Problem:** Each applicant card (`applicant-list.tsx` lines 123–538) shows full detail inline — including score breakdowns, metrics grid, co-applicant section, notes, AND an action panel. The user sees the same structure repeated 20+ times. Most of this information is not actionable for most applicants.

**Where:** `applicant-list.tsx` lines 123–538, the entire per-applicant render block inside the IIFE

**Impact:**

- An applicant with no red flags, score 92/100, status "Approved" — still shows 400+ lines of detail
- The user must manually scan each card looking for anomalies
- On mobile, this creates an infinitely scrolling list of dense content
- The information hierarchy within each card is flat — 20 `<Metric>` components with equal visual weight

**Recommendation — AI-first fix:**

- Show a compact list view by default: name, score, decision pill, status, 1-line summary
- Expand to full detail only on click (accordion pattern)
- Show AI-generated 1-line summary: "Jane Doe · 72/100 · Review · ⚠ Needs income docs"
- Use the AI review summary as the primary card content, not the raw metric grid
- Only show the detailed metric grid when the user clicks "Show details"

```typescript
// Compact view (default):
// ┌────────────────────────────────────────────┐
// │ Jane Doe  72/100  [Review]  [Screening]   │
// │ ⚠ Needs income docs · Screening 10d stale │
// │ [▶ Show details] [Actions: 2 ▼]           │
// └────────────────────────────────────────────┘

// Expanded view (on click):
// Shows full score breakdown, metrics, co-applicants, notes, action panel
```

## Finding 5: Confusing Information Hierarchy — Important vs. Administrative Blended

**Problem:** The dashboard blends operational content (pipeline, applicants, actions) with administrative content (billing, settings, account info) in the same view hierarchy. The `sectionTabs` at line 270–276 mix:

- `overview` — operational (PriorityFeed + pipeline)
- `new` — administrative (ApplicantForm for data entry)
- `billing` — administrative (BillingCard)
- `all` — operational (pipeline + priority)

**Where:** `applicant-dashboard.tsx` lines 22, 270–276, 436–444

**Impact:** A landlord logging in to check urgent items sees a "Billing" tab with equal prominence. The user must context-switch between operational decision-making and administrative tasks, increasing cognitive load.

**Recommendation — AI-first fix:**

- Move billing and settings to a separate navigation section (top nav bar)
- The primary navigation should be operational only: "Inbox" | "Pipeline" | "Messages" | "Admin"
- The mobile sidebar drawer already separates admin links — apply the same logic to desktop
- Show a subtle notification badge on "Admin" when action is needed (e.g., billing past due), but don't put it in the main operational flow

## Finding 6: No Default Prioritization — User Must Configure Filters

**Problem:** The filter defaults are "All" for decision, "All properties" for property, "Newest" for sort. This means by default, the user sees every applicant sorted by creation date — not sorted by urgency or risk.

**Where:** `applicant-dashboard.tsx` lines 63–65

**Impact:** A risk applicant approaching move-in might be on page 3 of the list because they were created earlier than newer, lower-risk applicants. The user must manually change the sort to find them — but the user doesn't know they exist yet.

**Recommendation — AI-first fix:**

- Default sort: by "NBA priority score" (P0 items first, then P1, then by risk descending)
- Default filter: show "Review" and "Risk" applicants always; hide "Strong" by default unless there are no issues
- Remember user's last filter selection (via UserPreferences from memory system)
- Show a count badge on the filter: "Review (8) · Risk (4) · Strong (12)"

## Finding 7: Repetitive Data Entry — Applicant Form Is Always Visible

**Problem:** The `ApplicantForm` component is permanently rendered in the left sidebar on desktop, taking up ~45% of screen width. This means on a typical dashboard view, nearly half the screen is a data entry form — not the operational content the user needs.

**Where:** `applicant-dashboard.tsx` lines 420–435, `components/dashboard/applicant-form.tsx`

**Impact:** Even when the user is not entering an applicant, the form occupies prime screen space with empty fields. The "Add applicant" action is a rare event (maybe 1-2 per day), but the form is always present.

**Recommendation — AI-first fix:**

- Replace the always-visible form with a floating "+" button
- Clicking it opens the form as a modal or slide-over
- This reclaims ~45% of screen width for operational content
- The form should also accept document uploads for AI extraction (existing capability via `uploadOpenAIFile`)

## Finding 8: No Proactive Communication — User Must Navigate to Draft

**Problem:** The communication assistant requires the user to be on an action card, then click a button, then wait for generation. There's no "unsent drafts" reminder or proactive suggestion.

**Where:** Proposed in `docs/ai-communication-assistant.md` — not yet implemented

**Impact:** Users who don't know the feature exists never benefit from it. Even users who know about it must go through a multi-step process to use it.

**Recommendation — AI-first fix:**

- When the NBA engine detects an action that benefits from communication (follow-up, document request), show the draft message inline — not behind a button
- Show a persistent "📝 2 unsent drafts" reminder in the copilot panel
- Allow one-click send from the action card itself

## Finding 9: No Contextual Help — User Must Know the Interface

**Problem:** There are no tooltips, contextual hints, or onboarding overlays. New users (or users with new features) must explore blindly.

**Impact:** Features like the NBA action panel are hidden behind a toggle. Users may not know they exist. The AI comparison button is just a button — no explanation of what it does or when to use it.

**Recommendation — AI-first fix:**

- The Copilot panel serves as always-available contextual help
- On first visit, show a brief overlay: "🤖 I'm your Copilot. Ask me anything about your applicants."
- Feature-level tooltips on complex controls: "AI review — generates a plain-English analysis using GPT-4o-mini"
- The Copilot should proactively suggest features: "I noticed you have 3 strong applicants — would you like me to compare them?"

## Finding 10: No Progressive Disclosure — Everything at Once

**Problem:** The entire page renders at full detail immediately. 6 summary cards, a full priority feed, filter controls, and 20+ applicant cards (each 800px of detail). This is information overload by volume.

**Recommendation — AI-first fix — The Calm Dashboard:**

### Proposed Layout (800px viewport)

```
┌──────────────────────────────────┐
│ 🤖 [What needs attention?]  [≡] │  ← Copilot input always available
├──────────────────────────────────┤
│ 🔴 2 urgent                     │  ← Only shows if there are urgent items
│   Jane Doe — Failed inspection   │
│   John Smith — Risk move-in 3d  │
├──────────────────────────────────┤
│ 🟡 3 actions                    │  ← Only shows if there are P1/P2 actions
│   • 3 stale in screening        │
│   • 2 ready to approve          │
│   • 1 unverified subsidy        │
├──────────────────────────────────┤
│ 📋 Pipeline (24)  [+ Add]       │  ← Condensed list, expand on click
│ Jane Doe         72  [Review] ⚠ │
│ John Smith       45  [Risk]  ⚠ │
│ Alice Brown      88  [Strong]   │
│ ...                              │
└──────────────────────────────────┘
```

### Proposed Layout (1920px viewport)

```
┌─────────────────────────────────────────────────────────────────────┐
│  RentNinja              [Inbox] [Pipeline] [Messages] [Admin] [👤]  │
├─────────────────────────────────────────────────────────────────────┤
│ 🤖 Copilot                            │  📋 Pipeline                │
│ ┌─────────────────────────────────┐   │                              │
│ │ "What needs attention?"    [➤] │   │  Jane Doe     72  [Review] ⚠│
│ └─────────────────────────────────┘   │  John Smith   45  [Risk]  ⚠│
│                                       │  Alice Brown  88  [Strong]  │
│ 🔴 2 urgent                          │  Mike Brown   85  [Strong]  │
│   [Jane—Failed inspection]           │  Lisa Wang    78  [Review]  │
│   [John—Risk move-in 3d]            │  Tom Jones    62  [Review]  │
│                                       │                              │
│ 🟡 3 actions                         │  [Filter ▼] [Sort ▼] [≡ 24] │
│   [3 stale screening—Send f/up]      │                              │
│   [2 ready to approve—View]         │  Click any applicant to      │
│   [1 subsidy pending—Verify]        │  expand full detail + actions│
│                                       │                              │
│ 📊 Portfolio snapshot                │                              │
│   24 apps · 72 avg · ↑3% WoW        │                              │
│   [Details ▾]                        │                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Combined Recommendation: The Calm AI-First Dashboard

### What Changes

| Current                          | Problem                               | Calmer Alternative                            |
| -------------------------------- | ------------------------------------- | --------------------------------------------- |
| 6 static metric cards            | No prioritization, same visual weight | Single smart summary line + expandable detail |
| Hero header with tagline         | Wastes 200px after first visit        | Condensed top bar after first visit           |
| PriorityFeed shows all items     | Information overload                  | Show only top 3, "Show all" expand            |
| ApplicantList full detail inline | Repetitive, each card is 800px        | Compact list, expand on click                 |
| ActionPanel hidden behind toggle | 3 clicks to reveal                    | Auto-expand for P0/P1, badge indicator        |
| ApplicantForm always visible     | 45% of screen is rarely-used form     | Floating "+" button, modal on click           |
| Billing in main navigation       | Administrative task mixed with ops    | Move to Admin section                         |
| No persistent help               | New features invisible                | Copilot panel always accessible               |
| Actions generated per-applicant  | Slow, on-demand                       | Batch-generate on dashboard load              |
| Default sort by created date     | Buries urgent items                   | Default sort by NBA priority                  |

### Priority Order for Implementation

1. **Auto-expand P0 actions** — Eliminate 3 clicks for urgent items (lowest effort, highest impact)
2. **Compact applicant list** — Replace full-detail cards with summary rows, expand on click
3. **Condensed hero header** — Show full header on first visit only, then minimize
4. **Smart summary line** — Replace 6 metric cards with anomaly-gated smart text
5. **Top-3 priority feed** — Show only most critical items by default
6. **Modal applicant form** — Move from always-visible sidebar to floating button
7. **Batch action generation** — Generate on load, not on toggle
8. **NBA-priority default sort** — Urgency-first ordering
9. **Operational nav separation** — Move billing/settings to Admin tab
10. **Copilot as default entry point** — Primary interaction mode

### Screen Real Estate Comparison (1920×1080)

| Element                   | Current (px²)               | Calm (px²)                | Reduction                           |
| ------------------------- | --------------------------- | ------------------------- | ----------------------------------- |
| Hero header               | 200 × 1440 = 288,000        | 48 × 1440 = 69,120        | **76%**                             |
| Summary cards             | 300 × 1440 = 432,000        | 60 × 1440 = 86,400        | **80%**                             |
| Priority feed (10 items)  | 500 × 1440 = 720,000        | 200 × 700 = 140,000       | **81%**                             |
| Applicant form            | Always present              | Modal on demand           | **100%** when not in use            |
| Applicant list (20 cards) | 800 × 20 = 16,000 px scroll | 60 × 20 = 1,200 px scroll | **92.5%** reduction in scroll depth |

### Key Metric: Clicks to Action

| Action                 | Current                                                                | Calm                                      | Improvement                     |
| ---------------------- | ---------------------------------------------------------------------- | ----------------------------------------- | ------------------------------- |
| View urgent items      | Scroll past 400px, find item                                           | Auto-shown at top                         | Instant                         |
| Act on P0 item         | 3 clicks (toggle + open + accept)                                      | 1 click (accept inline)                   | **67% reduction**               |
| Send follow-up         | 6 clicks (find applicant + toggle + generate + draft + send + confirm) | 3 clicks (tap inline draft + edit + send) | **50% reduction**               |
| View applicant details | Scroll 800px card                                                      | Click to expand                           | **1 click vs. infinite scroll** |
| Compare applicants     | Scroll to button + click + wait                                        | "Top applicant: Sarah Kim 92/100" inline  | **Zero navigation**             |
