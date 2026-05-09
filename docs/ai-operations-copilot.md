# RentNinja AI Operations Copilot — Master Design Document

## The Vision

RentNinja is not property management software. It is an **AI operations copilot** for landlords and property managers.

Traditional PM software is a tool you operate: you click buttons, fill forms, read reports, and make decisions. RentNinja is a partner that operates alongside you: it watches your pipeline, anticipates your needs, handles routine tasks autonomously, alerts you only when judgement is required, and gets smarter the more you use it.

The goal: **a landlord should be able to manage 100 units in 10 minutes a day.**

## The Shift

| Traditional Software                | AI Operations Copilot                       |
| ----------------------------------- | ------------------------------------------- |
| You tell the computer what to do    | The computer tells you what needs attention |
| You search for information          | Information surfaces proactively            |
| You configure rules manually        | Rules are learned from your behavior        |
| You execute every action            | Routine actions execute autonomously        |
| You read dashboards                 | You read plain-English summaries            |
| You learn the interface             | The interface learns you                    |
| Desktop-first, mobile uncomfortable | Mobile-first, notifications as entry point  |
| Everything is equally visible       | Only what matters is visible                |

## Workflow Analysis

### Workflow 1: Daily Pipeline Review

**Goal:** Understand what's happening with all applicants today.

**Current experience:**

```
1. Open app → see loading state
2. Wait for dashboard to render
3. Scan 6 summary cards (all equal weight)
4. Scroll past hero header (200px of marketing copy)
5. Scan priority feed (10-20 items, no grouping)
6. Scroll through applicant list (20+ cards, 800px each)
7. Click each applicant's toggle to reveal actions
8. Wait for API call per applicant
9. Read actions → decide → click
10. Repeat for next applicant
```

| Dimension                  | Assessment                                                                |
| -------------------------- | ------------------------------------------------------------------------- |
| **Friction**               | High — 10 steps before any action taken                                   |
| **Repetitive**             | Extreme — same scan pattern daily, even when nothing changed              |
| **Cognitive overload**     | Very high — 6 cards + 20 items + 20 applicant cards = information tsunami |
| **AI opportunity**         | Massive — the NBA engine already knows what's urgent. Show it first.      |
| **Automation opportunity** | High — auto-resolve can handle 4 of 7 common action types silently        |

**Copilot redesign:**

```
1. Open app → see "🔴 2 urgent · 🟡 3 actions · 24 apps healthy"
2. Urgent items are at the top (0 scrolling)
3. Swipe right to accept, left to dismiss (0.5 seconds per action)
4. AI summary replaces 6 metric cards: "Pipeline is stable. Average score ↑3% WoW."
5. Batch actions: "Resolve all 3 stale screenings?" → one tap
6. Daily auto-resolve summary: "5 tasks completed silently today"
```

| Improvement          | Metric          |
| -------------------- | --------------- |
| Steps to act         | 10 → 2          |
| Time to first action | 30s → 2s        |
| Items scanned        | 46+ → 5         |
| Clicks per action    | 3 → 0.5 (swipe) |

---

### Workflow 2: Applicant Evaluation

**Goal:** Decide whether to approve or reject an applicant.

**Current experience:**

```
1. Find applicant in list (scroll, search, or filter)
2. Scan 800px card: name, score, decision pill, 20 metric labels
3. Optionally click "AI review" → wait 3-5 seconds
4. Read AI review summary
5. Scroll more to see red flags, score breakdown, co-applicants, notes
6. Toggle action panel → wait for API
7. Read NBA suggestions
8. Click Accept/Skip/Override
9. Optionally click "Send message" → wait for generation → edit → send
```

| Dimension                  | Assessment                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Friction**               | High — 9 steps, 2 API waits, vertical scroll of 800px                                          |
| **Repetitive**             | High — same structure for every applicant, healthy or not                                      |
| **Cognitive overload**     | High — 20 metrics with equal visual weight. Red flags mixed with neutral data.                 |
| **AI opportunity**         | High — risk intelligence + green flags + NBA engine all exist. Just need unified presentation. |
| **Automation opportunity** | Medium — green flag fast-track can auto-approve. But final decision needs human.               |

**Copilot redesign:**

```
1. Applicant appears in pipeline with AI summary line:
   "Jane Doe · 72/100 · Review · ⚠ Needs income docs · ✅ Income verified"
2. Tap → bottom sheet shows:
   - Net assessment: "3 green flags, 2 red flags — Review with lean toward approve"
   - Risk profile bars: Fraud 🟢 Payment 🟡 Lease 🟢 Docs 🟡
   - Key actions: [Approve] [Request docs] [Send follow-up]
3. Swipe right on "Approve" → done. Or tap "Request docs" → draft generated instantly.
```

| Improvement         | Metric                          |
| ------------------- | ------------------------------- |
| Steps to approve    | 9 → 2                           |
| Time per applicant  | 60s → 10s                       |
| Information density | 800px scroll → 40% bottom sheet |
| API waits           | 2 → 0                           |

---

### Workflow 3: Managing Pipeline Bottlenecks

**Goal:** Identify and resolve applicants stuck in the pipeline.

**Current experience:**

```
1. Notice "Screening" status on some applicants during daily review
2. Manually count how many are stuck
3. For each stuck applicant:
   a. Click to open
   b. Check updatedAt date
   c. Calculate days since update (mental math)
   d. Decide if it's a problem (>7 days?)
   e. Toggle action panel
   f. Accept "Follow up" or "Send message"
   g. Write or generate a message
   h. Send
4. No way to batch — repeat for each stuck applicant
```

| Dimension                  | Assessment                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Friction**               | Very high — manual counting, mental math, per-applicant repetition                                    |
| **Repetitive**             | Extreme — identical workflow for every stuck applicant                                                |
| **Cognitive overload**     | Medium — mental math for days-since update is unnecessary                                             |
| **AI opportunity**         | Already exists — `followup_screening` NBA rule, `detectBottlenecks()`. Just need proactive surfacing. |
| **Automation opportunity** | High — auto-resolve can queue follow-ups. Batch actions can send all at once.                         |

**Copilot redesign:**

```
1. Inbox shows: "🟡 3 stale in screening (7-14 days without update)"
2. Tap → bottom sheet shows names and durations
3. "Send follow-ups to all 3?" → one tap
4. Drafts are queued as auto-resolved (visible in outbox)
5. Pipeline health panel: "Stale screening: 3 ↓ improving from 5 last week"
```

| Improvement          | Metric              |
| -------------------- | ------------------- |
| Steps to resolve all | 24+ → 2             |
| Time to act          | 15 min → 15 seconds |
| Mental math required | Yes → Zero          |
| Batch capability     | None → Batch all    |

---

### Workflow 4: Risk Assessment

**Goal:** Determine if an applicant is high-risk before making a decision.

**Current experience:**

```
1. See "Risk" decision pill or red flags in applicant card
2. Scan red flags list (plain text)
3. No fraud indicators visible (disposable email, duplicate, etc.)
4. No green flag counterbalance visible
5. Must rely on memory of what "Risk" threshold means
6. Click "AI review" if want more analysis → wait
7. Decision: approve anyway, request more docs, or reject
```

| Dimension                  | Assessment                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Friction**               | Medium — risk info exists but is scattered                                                                              |
| **Repetitive**             | Low — each risk case is unique                                                                                          |
| **Cognitive overload**     | High — no prioritization of which red flags matter most. No green flag balance.                                         |
| **AI opportunity**         | Very high — risk intelligence system (33 rules) + green flags both designed but not yet integrated into a unified view. |
| **Automation opportunity** | Low — risk decisions require human judgement                                                                            |

**Copilot redesign:**

```
1. Applicant card shows: "⚠ Risk (45/100) · 3 red flags · 1 green flag"
2. Risk breakdown visible at a glance:
   Fraud: 🟢 Low (5/100)    Payment: 🔴 Critical (72/100)
   Lease: 🟡 Moderate (35/100)  Docs: 🟡 Moderate (42/100)
3. Key driver: "Payment risk driven by affordability at 1.8x (policy min: 2.5x)"
4. Green flag note: "Income verified at 2.8x effective — close to threshold"
5. Suggested action: "Request additional income documentation or co-signer"
```

| Improvement        | Metric                                         |
| ------------------ | ---------------------------------------------- |
| Risk comprehension | Split across sections → Unified risk dashboard |
| Fraud visibility   | Hidden → Always visible                        |
| Green flag balance | None → Shown alongside red flags               |
| Decision support   | Raw numbers → Plain-English guidance           |

---

### Workflow 5: Communication with Applicants

**Goal:** Send professional follow-ups, document requests, and decision notifications.

**Current experience:**

```
1. Navigate to applicant
2. Toggle action panel
3. Look for "Send message" — no button exists (proposed only)
4. Open email client separately
5. Manually compose email:
   a. Remember applicant's name, property, status
   b. Decide what to say
   c. Type it out
   d. Copy-paste into email
   e. Send
6. No record in the app that message was sent
```

| Dimension                  | Assessment                                                                      |
| -------------------------- | ------------------------------------------------------------------------------- |
| **Friction**               | Very high — leaves the app entirely, manual composition                         |
| **Repetitive**             | High — same follow-up pattern, same doc request pattern                         |
| **Cognitive overload**     | Medium — composing from scratch each time                                       |
| **AI opportunity**         | Very high — communication assistant already designed (5 message types, 3 tones) |
| **Automation opportunity** | High — auto-resolve can queue follow-up drafts. Never auto-send.                |

**Copilot redesign:**

```
1. NBA suggests: "📝 Send follow-up to Jane Doe (screening 10 days)"
2. One tap → generated draft appears inline:
   "Subject: Quick check-in on your application...
    Hi Jane, just checking in on your application..."
3. [Tone: Warm ▼] [Edit] [Send] [Regenerate]
4. Sent messages appear in applicant's communication history
5. Follow-up is auto-queued if no response in 7 days
```

| Improvement       | Metric                          |
| ----------------- | ------------------------------- |
| Steps to send     | 8 (leave app) → 2 (in app)      |
| Time per message  | 5 min → 30 seconds              |
| Message templates | None → 5 AI-generated types     |
| Audit trail       | None → Full history             |
| Auto-follow-up    | None → Auto-queued after 7 days |

---

### Workflow 6: Managing Tenant Portfolio

**Goal:** Understand overall portfolio health, trends, and future outlook.

**Current experience:**

```
1. Dashboard shows 6 metric cards (total, strong, review, risk, avg score, affordability)
2. Numbers are static — no comparison to last week/month
3. No trend arrows — "24 applicants" could be up or down
4. No anomaly detection — normal and abnormal look identical
5. No predictions — "what's coming next week?"
6. No tenant memory — returning applicants appear as new
```

| Dimension                  | Assessment                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------- |
| **Friction**               | Medium — data exists but lacks context                                             |
| **Repetitive**             | High — same numbers, same format, every day                                        |
| **Cognitive overload**     | Medium — 6 numbers with no trend context. Is 72/100 good? Better than last week?   |
| **AI opportunity**         | Very high — portfolio insights engine designed with trends, anomalies, predictions |
| **Automation opportunity** | Medium — daily snapshot can auto-generate. Weekly digest can auto-email.           |

**Copilot redesign:**

```
1. "📊 Portfolio snapshot: 24 apps · 72 avg · ↑3% WoW · Healthy"
2. Only anomalies are highlighted: "⚠ Risk ratio ↑15% this week — review screening policy"
3. One-tap trend view: score chart, volume chart, decision distribution
4. "📈 Next week: expected 28-32 applications (spring uptick)"
5. Returning tenant alerts: "🔄 Jane Doe is a returning applicant — previously approved, 12 on-time payments"
```

| Improvement         | Metric                                       |
| ------------------- | -------------------------------------------- |
| Data context        | Static numbers → Trends + anomaly highlights |
| Trend visibility    | None → WoW/MoM arrows                        |
| Anomaly detection   | None → Auto-flagged deviations               |
| Predictions         | None → 7-day forecast                        |
| Returning tenant ID | None → Auto-recognized                       |

---

### Workflow 7: Handling Urgent Issues

**Goal:** Respond quickly to critical issues that require immediate attention.

**Current experience:**

```
1. Issue occurs (inspection fails, move-in approaching)
2. User may not know until next login (hours or days later)
3. When they do log in: scroll past header, past cards, past feed
4. Find the applicant (if they even remember)
5. Click toggle → see action → read → decide → click
6. No notification, no alert, no sense of urgency in UI
```

| Dimension                  | Assessment                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------- |
| **Friction**               | Critical — no alerting mechanism for urgent items                                   |
| **Repetitive**             | N/A — each urgent issue is unique                                                   |
| **Cognitive overload**     | High — urgent item is buried in the same layout as info items                       |
| **AI opportunity**         | Critical — NBA already detects P0 items. Need push notification + priority display. |
| **Automation opportunity** | Low — P0 items always need human judgement                                          |

**Copilot redesign:**

```
1. Push notification: "🔴 Jane Doe — Failed inspection, 14 days overdue"
2. Tap notification → app opens directly to action bottom sheet
3. Options: [Schedule re-inspection] [Mark as Rejected] [Dismiss]
4. Lock screen quick actions (force touch): "Schedule re-inspection"
5. Inbox tab always shows P0 items at top with red banner
6. "Resolve all urgent" batch action if multiple P0s exist
```

| Improvement       | Metric                                                                |
| ----------------- | --------------------------------------------------------------------- |
| Detection time    | Hours/days → Instant push                                             |
| Steps to act      | 7 (find + toggle + read + decide) → 2 (tap notification + tap action) |
| Time to resolve   | 5+ minutes → 8 seconds                                                |
| Visibility in app | Buried → Always on top, red banner                                    |

---

## The Unified Copilot Experience

### Desktop: Calm Command Center

```
┌──────────────────────────────────────────────────────────────────────┐
│  RentNinja                🤖 [Ask anything...]                       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔴 2 urgent · 🟡 3 actions · 📊 24 apps · ✅ 5 auto-resolved today │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │  URGENT                                   [Resolve all ▾]  │     │
│  │  ┌──────────────────────────────────────────────────────┐  │     │
│  │  │ 🔴 Failed inspection — Jane Doe             [Resolve]│  │     │
│  │  │ 🔴 Risk move-in 3 days — John Smith         [Resolve]│  │     │
│  │  └──────────────────────────────────────────────────────┘  │     │
│  │                                                              │     │
│  │  ACTIONS                                                     │     │
│  │  ┌──────────────────────────────────────────────────────┐  │     │
│  │  │ 🟡 3 stale in screening                     [Follow up]│  │     │
│  │  │ 🟡 2 ready to approve                       [Approve] │  │     │
│  │  │ 🟡 1 unverified subsidy                     [Verify]  │  │     │
│  │  └──────────────────────────────────────────────────────┘  │     │
│  │                                                              │     │
│  │  PIPELINE (24)         [Filter ▼] [Sort: Priority ▼]        │     │
│  │  ┌──────────────────────────────────────────────────────┐  │     │
│  │  │ Jane Doe   72  [Review]  ⚠ 3 red, 2 green flags     │  │     │
│  │  │ John Smith 45  [Risk]    🔴 Move-in 3 days           │  │     │
│  │  │ Alice Brn  88  [Strong]  ✅ Fast-track eligible      │  │     │
│  │  │ ...                                                  │  │     │
│  │  └──────────────────────────────────────────────────────┘  │     │
│  └────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile: Thumb-First Operations Hub

```
┌──────────────────────────────────┐
│  📥 Inbox          🔴 5 items   │
├──────────────────────────────────┤
│  🔴 2 urgent · 🟡 3 actions     │
│                                  │
│  ← Failed inspection — Jane Doe │
│  ← Risk move-in — John Smith   │
│  → 3 stale screening            │
│  → 2 ready to approve           │
│                                  │
│  Auto-resolved: 5 tasks ✅      │
├──────────────────────────────────┤
│  [Inbox] [📋] [🔍] [🤖] [≡]    │
└──────────────────────────────────┘
```

### Voice: Hands-Free Operations

```
User: "What needs my attention?"
Copilot: "2 urgent items. Jane Doe's inspection failed — 14 days overdue.
          John Smith's move-in is in 3 days with a Risk score of 45.
          Also, 3 applicants are stuck in screening."
User: "Schedule re-inspection for Jane"
Copilot: "Done. Re-inspection scheduled for May 12."
```

### Notification: The Primary Entry Point

| Scenario             | Notification                          | Tap Action              |
| -------------------- | ------------------------------------- | ----------------------- |
| Failed inspection    | 🔴 Jane Doe — inspection failed (14d) | Opens action sheet      |
| Move-in approaching  | 🔴 John Smith — move-in in 3 days     | Opens action sheet      |
| Stale screening      | 🟡 3 applicants stuck in screening    | Opens inbox filtered    |
| Fast-track available | 🟡 2 ready for fast-track approval    | Opens pipeline filtered |
| Auto-resolve digest  | ✅ 5 tasks resolved today             | Opens auto-resolve log  |
| Returning tenant     | 🔄 Jane Doe is a returning applicant  | Opens tenant history    |

## System Architecture: All Pieces Working Together

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Interaction Layer                          │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  Desktop: Calm   │  │  Mobile: Thumb-  │  │  Notifications +   │  │
│  │  Command Center  │  │  First Ops Hub   │  │  Voice Copilot     │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Intelligence Layer                               │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  Next Best       │  │  Risk Intelligence│  │  Green Flag        │  │
│  │  Action Engine   │  │  33 rules across  │  │  Intelligence      │  │
│  │  13 rules, P0-P2 │  │  5 dimensions    │  │  3 positive signals │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  Operational     │  │  Portfolio       │  │  Communication     │  │
│  │  Inbox           │  │  Insights        │  │  Assistant         │  │
│  │  5 detectors     │  │  Trends, anomaly │  │  5 message types   │  │
│  │                  │  │  predictions     │  │  3 tones           │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  Memory &        │  │  Auto-Resolve    │  │  AI Copilot        │  │
│  │  Personalization │  │  Engine          │  │  Natural Language  │  │
│  │  3 memory models │  │  7 auto-resolvers│  │  12 intent handlers│  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Feedback Layer                                │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  Explicit:       │  │  Implicit:       │  │  Accuracy          │  │
│  │  👍/👎 Feedback  │  │  Accept/Skip     │  │  Calibration       │  │
│  │  on actions      │  │  patterns        │  │  via feedback      │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## How Each Design Principle Manifests

### Calm

- **Urgent items are at the top.** Always. No scrolling required.
- **Normal state is quiet.** When nothing is wrong, the UI says "All caught up" — not 6 metric cards of noise.
- **Auto-resolve handles routine tasks.** The user never sees 4 of 7 common action types.
- **Notifications respect quiet hours.** P0 still breaks through. P1-P2 wait.

### Intelligent

- **NBA engine knows what's urgent.** It evaluates 13 rules against every applicant.
- **Risk intelligence knows 33 signals.** Fraud, payment, lease, document, behavioral.
- **Green flag intelligence knows positives.** Income verified, payment history strong, employment stable.
- **Portfolio insights know trends, anomalies, and predictions.** WoW/MoM changes, Z-score outliers, 7-day forecasts.
- **Memory knows the landlord, the tenant, and the organization.** Approval profile, workflow habits, tenant lease history.

### Proactive

- **Push notifications for P0.** The user doesn't check the app. The app alerts them.
- **Auto-resolve runs hourly.** Stale actions expire. Old info dismisses. Rejected applicants archive.
- **Follow-ups queue automatically.** Screening >7 days? Draft is ready. Docs missing 5 days? Follow-up queued.
- **Returning tenants are recognized.** "Jane applied before — here's her history."
- **Copilot suggests before asked.** "I noticed 3 strong applicants — would you like to compare them?"

### Low-Effort

- **Swipes replace clicks.** Right = accept, left = dismiss.
- **AI summaries replace dashboards.** "Pipeline healthy" instead of 6 metric cards.
- **Voice replaces navigation.** "What's urgent?" instead of tapping through tabs.
- **One-tap batch actions.** "Resolve all stale screenings" instead of per-applicant repetition.
- **Auto-resolve replaces manual maintenance.** 5 tasks per day handled silently.

### Explainable

- **Every action shows "Why".** Rule, facts, threshold, confidence.
- **Every signal cites its source.** "According to the scoring engine..." / "Per screening policy..."
- **Every AI response has a source list.** "Sources: Priority Feed, NBA Engine, Portfolio Insights"
- **Every confidence score has a rationale.** "Confidence: 85% — base 90% reduced by data completeness at 0.8x"

## Implementation Priority

| Priority | Feature                                        | Based On                 | Effort | Impact  |
| -------- | ---------------------------------------------- | ------------------------ | ------ | ------- |
| P0       | Auto-expand P0/P1 actions                      | Cognitive load audit     | Low    | Highest |
| P0       | Push notifications for urgent items            | Mobile AI workflows      | Medium | Highest |
| P0       | Inbox as default view (urgent first)           | Cognitive load audit     | Low    | Highest |
| P1       | Compact applicant list with AI summaries       | Cognitive load audit     | Medium | High    |
| P1       | Swipe-to-act on mobile                         | Mobile AI workflows      | Medium | High    |
| P1       | Bottom sheet applicant detail                  | Mobile AI workflows      | Medium | High    |
| P1       | Auto-resolve engine (expire, dismiss, archive) | Auto-resolve engine      | Medium | High    |
| P2       | Green flag detection + display                 | Green flag intelligence  | Medium | Medium  |
| P2       | Smart summary line (replaces metric cards)     | Cognitive load audit     | Low    | Medium  |
| P2       | Auto-tag applicants                            | Auto-resolve engine      | Low    | Medium  |
| P3       | Voice copilot                                  | AI Copilot               | High   | Medium  |
| P3       | Portfolio trends + anomalies UI                | Portfolio insights       | Medium | Medium  |
| P3       | Tenant memory + returning tenant alerts        | Memory & personalization | Medium | Medium  |
| P4       | Auto-resolve follow-ups + doc requests         | Auto-resolve engine      | High   | Low     |
| P4       | Personalized NBA confidence                    | Memory & personalization | Medium | Low     |

## The 10-Minute Day

A landlord managing 100 units can complete their daily operations in 10 minutes:

| Minute | Task                           | How                                                                                 |
| ------ | ------------------------------ | ----------------------------------------------------------------------------------- |
| 0:00   | Check notifications            | P0 alerts already pushed. 2 urgent items resolved in 8 seconds each.                |
| 0:30   | Review inbox                   | 3 P1 actions. Tap → swipe → done. 30 seconds.                                       |
| 1:30   | Check pipeline                 | AI summary shows portfolio is healthy. Quick scan of 5 flagged applicants.          |
| 3:00   | Handle flagged applicants      | Bottom sheet per applicant. Green/red flag balance. Swipe to act. 90 seconds for 5. |
| 5:00   | Review auto-resolve digest     | 5 tasks handled silently. Quick scan. "Undo" if needed.                             |
| 5:30   | Check portfolio trends         | AI summary: "↑3% WoW, approval rate stable, spring uptick expected."                |
| 6:00   | Respond to copilot suggestions | "3 applicants ready for fast-track — approve?" One tap.                             |
| 7:00   | Review returning tenant alerts | "Jane Doe is back — previously approved, 12 on-time payments."                      |
| 8:00   | Spot-check outliers            | Portfolio insights flagged 1 anomaly. Quick investigation.                          |
| 9:00   | Review pending actions         | Batch action: "Send follow-ups to all stale screenings." One tap.                   |
| 10:00  | Done                           | Close app. Notifications will handle anything urgent.                               |

## Files Referenced Throughout This Document

| File                                   | Contribution                                               |
| -------------------------------------- | ---------------------------------------------------------- |
| `lib/action-engine.ts`                 | 13 NBA rules — the copilot's decision engine               |
| `lib/ai-operations.ts`                 | 5 detectors — the copilot's awareness layer                |
| `lib/scoring.ts`                       | Scoring + red flags — the copilot's evaluation layer       |
| `lib/feedback-engine.ts`               | Accuracy calibration — the copilot's learning mechanism    |
| `lib/green-flags.ts` (proposed)        | Positive signal detection — the copilot's optimism         |
| `lib/auto-resolve.ts` (proposed)       | Silent task execution — the copilot's hands                |
| `lib/copilot-engine.ts` (proposed)     | Natural language + intent routing — the copilot's voice    |
| `lib/portfolio-insights.ts` (proposed) | Trends + anomalies + predictions — the copilot's foresight |
| `lib/risk-intelligence.ts` (proposed)  | 33 risk signals — the copilot's caution                    |
| `lib/personalization.ts` (proposed)    | Memory models — the copilot's memory                       |
| `lib/push-notifications.ts` (proposed) | Alert dispatch — the copilot's urgency                     |
| All UI components                      | Surface layer — the copilot's face                         |

## Fulfillment Table

| Requirement                           | How It's Met                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identify friction**                 | 7 workflows analyzed. Each shows current steps vs. copilot redesign with measurable improvements.                                                                               |
| **Identify repetitive tasks**         | Daily pipeline review, bottleneck resolution, communication, portfolio monitoring — all identified as repetitive with specific automation replacements.                         |
| **Identify cognitive overload**       | 6 metric cards (equal weight), 800px applicant cards, 20+ items in feed, mental math for days-since — all identified and replaced with AI summaries and progressive disclosure. |
| **Identify AI opportunities**         | NBA engine, risk intelligence, green flags, portfolio insights, communication assistant, memory/personalization, copilot — all 7 AI systems mapped to specific friction points. |
| **Identify automation opportunities** | Auto-resolve handles 7 tasks: expire, dismiss, archive, tag, remind, request docs, sync scores.                                                                                 |
| **Propose AI recommendations**        | Every workflow has specific AI recommendations with measurable improvement metrics.                                                                                             |
| **Propose workflow automation**       | Auto-resolve engine runs hourly. Batch actions for multi-applicant operations.                                                                                                  |
| **Propose proactive intelligence**    | Push notifications for P0. Returning tenant alerts. Predictive forecasts. Copilot suggestions before user asks.                                                                 |
| **Propose mobile-first improvements** | Bottom tab bar, swipe gestures, bottom sheets, voice input, notification entry, one-thumb workflows.                                                                            |
| **Propose explainability systems**    | Every action shows rule/facts/threshold/confidence. Every signal cites source. Every AI response has source list. Confidence scores show rationale.                             |
