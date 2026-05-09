# AI Copilot Assistant — Design Document

## Overview

The AI Copilot Assistant is an embedded conversational interface that gives property managers a single natural language entry point to every AI capability in the platform. Instead of navigating between tabs, clicking through menus, or interpreting dashboards, the landlord can simply ask: "What needs my attention today?" or "Tell me about Jane Doe's application" — and the Copilot responds with a synthesized answer drawing from the NBA engine, operational inbox, risk intelligence, portfolio insights, communication assistant, and tenant memory systems.

The Copilot is not a separate feature — it is the unified surface layer over all existing AI systems.

## Design Principles

1. **Conversational, not chat-only** — The Copilot lives in a persistent slide-over panel, not a full-screen chat. It provides quick answers, actionable shortcuts, and inline previews without leaving the current view.
2. **Context-aware** — The Copilot knows what page the user is on, what applicant they're viewing, what time of day it is, and their personal preferences. Answers are grounded in the current context.
3. **Action-oriented** — The Copilot does not just answer questions. Every response includes actionable shortcuts: buttons, links, and one-click actions that execute the recommendation.
4. **Transparent reasoning** — The Copilot cites its sources: "According to the scoring engine, this applicant scores 72/100 with an affordability ratio of 2.8x." Users can click "Show why" to see the underlying data and rules.
5. **Predictive, not reactive** — The Copilot proactively surfaces suggestions based on the operational inbox and portfolio insights, not just when the user asks a question.
6. **Privacy-first** — The Copilot only accesses data the user already has permission to see. No cross-organization data leakage. All queries are logged for audit.

## Capabilities

| Capability                    | Description                                                                                       | Backed By                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Natural language queries**  | Ask questions in plain English about applicants, pipeline, risk, tenants, actions                 | Context engine + OpenAI structured responses      |
| **Operational summaries**     | "What's the status of my pipeline?" — returns a concise summary with key metrics                  | Portfolio insights + operational inbox            |
| **Workflow shortcuts**        | "Move Jane to Screening" or "Send a follow-up to John" — executes actions inline                  | NBA engine + communication assistant + action API |
| **Recommendations**           | "What should I do next?" — returns prioritized NBA actions across all applicants                  | NBA engine + operational inbox                    |
| **Tenant/applicant insights** | "Tell me about Jane Doe" — returns risk profile, scores, red flags, action history, tenant memory | Risk intelligence + scoring + tenant memory       |
| **Explainable reasoning**     | "Why is this a P0?" — shows the rule, facts, and threshold that triggered the action              | NBA explainability model + FactTrail              |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     AI Copilot Assistant Panel                          │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Input: Natural Language or Suggestion Chip                    │    │
│  │  ┌──────────────────────────────────────────────────────────┐ │    │
│  │  │ "What needs my attention today?"  [Suggestions ▼] [Send] │ │    │
│  │  └──────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                           │                                             │
│                           ▼                                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │  Query Router                                                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────┐ │    │
│  │  │ Intent   │→│ Context  │→│ Data     │→│ Response        │ │    │
│  │  │ Classify │ │ Enrich   │ │ Fetch    │ │ Synthesis       │ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                           │                                             │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Backend Systems (Existing)                           │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ NBA Engine   │ │ Operational  │ │ Risk Intel   │ │ Portfolio    │  │
│  │ (action-     │ │ Inbox        │ │ (scoring +   │ │ Insights     │  │
│  │  engine.ts)  │ │ (ai-ops.ts)  │ │  risk-intel) │ │ (portfolio)  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Communication│ │ Memory &     │ │ Action API   │ │ OpenAI       │  │
│  │ Assistant    │ │ Personalize  │ │ (generate,   │ │ (structured  │  │
│  │ (comm-       │ │ (memory)     │ │  act, hist)  │ │  responses)  │  │
│  │  assistant)  │ │              │ │              │ │              │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Query Processing Pipeline

### Step 1: Intent Classification

Every user query is classified into one of these intents:

| Intent              | Example Queries                                                             | Handler                              |
| ------------------- | --------------------------------------------------------------------------- | ------------------------------------ |
| `pipeline_summary`  | "What's the status of my pipeline?", "How many applicants?"                 | Portfolio insights                   |
| `applicant_detail`  | "Tell me about Jane Doe", "Show me John Smith's application"                | Scoring + risk intel + tenant memory |
| `next_actions`      | "What should I do next?", "What needs my attention?"                        | NBA engine + operational inbox       |
| `execute_action`    | "Move Jane to Screening", "Send follow-up to John", "Approve Alice"         | Action API + communication assistant |
| `risk_assessment`   | "Is Jane a risky applicant?", "Show me red flags for John"                  | Risk intelligence                    |
| `trend_question`    | "How has my pipeline changed this week?", "What's the approval rate trend?" | Portfolio insights                   |
| `comparison`        | "Who is the best applicant?", "Compare Jane and John"                       | AI comparison route                  |
| `document_request`  | "What documents are missing for Jane?"                                      | Scoring + NBA document rules         |
| `explain_reasoning` | "Why is this a P0?", "Why was this flagged?"                                | NBA explainability model             |
| `tenant_history`    | "Has Jane applied before?", "What's Jane's lease history?"                  | Tenant memory                        |
| `workflow_help`     | "How do I enable automation?", "What does this button do?"                  | Documentation lookup                 |
| `unknown`           | "What's the weather?"                                                       | Graceful fallback                    |

### Step 2: Context Enrichment

The Copilot enriches the query with:

```typescript
interface CopilotContext {
  userId: string;
  organizationId: string;
  currentPage: string; // e.g. "dashboard", "applicant_detail"
  currentApplicantId?: string; // If viewing an applicant
  currentSection?: string; // "overview" | "new" | "billing" | "all"
  recentActions: ActionRecord[]; // Last 5 actions taken
  userPreferences: UserPreferences; // Tone, filters, defaults
  timeOfDay: string; // "morning" | "afternoon" | "evening"
  dayOfWeek: number; // 0-6
  pipelineStatus: {
    // Quick summary for context
    total: number;
    new: number;
    urgentCount: number;
    staleCount: number;
  };
}
```

### Step 3: Data Fetching

Based on the intent and context, the Copilot fetches data from the appropriate backend systems. This is synchronous — the Copilot doesn't stream responses but collects all data first, then synthesizes.

### Step 4: Response Synthesis

The Copilot uses OpenAI's `createStructuredOpenAIResponse()` to generate a natural language response with embedded actions:

```typescript
interface CopilotResponse {
  message: string; // Natural language answer
  suggestions: SuggestionChip[]; // Follow-up suggestions
  actions: CopilotAction[]; // Inline action buttons
  sources: SourceCitation[]; // Data sources used
  confidence: "high" | "medium" | "low";
}
```

## UI Model

### Panel Position & Behavior

- **Position:** Slide-over panel from the right side, overlaying the main content
- **Width:** 420px on desktop, full-width on mobile
- **Trigger:** Clickable "🤖 Copilot" button fixed to the bottom-right corner
- **Persistence:** Panel remembers its open/closed state per user session
- **Esc:** Closes the panel

### Default State (No query yet)

```
┌──────────────────────────────────┐
│  🤖 AI Copilot              [✕] │
├──────────────────────────────────┤
│                                  │
│  Good morning, Sarah!            │
│                                  │
│  ┌────────────────────────────┐ │
│  │  📊 Pipeline snapshot      │ │
│  │  24 applicants             │ │
│  │  4 urgent items            │ │
│  │  3 stale in screening      │ │
│  └────────────────────────────┘ │
│                                  │
│  Try asking:                     │
│                                  │
│  [What needs my attention?]     │
│  [Tell me about my pipeline]    │
│  [Show urgent items]            │
│  [How is my portfolio doing?]   │
│                                  │
│  ┌────────────────────────────┐ │
│  │ "What needs my attention?" │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
```

### Query Response State

```
┌──────────────────────────────────┐
│  🤖 AI Copilot              [✕] │
├──────────────────────────────────┤
│                                  │
│  You asked: "What needs my       │
│  attention today?"               │
│                                  │
│  ────────────────────────────    │
│                                  │
│  You have 4 items requiring      │
│  attention:                      │
│                                  │
│  🔴 URGENT (2)                   │
│  ┌────────────────────────────┐ │
│  │ Failed inspection —        │ │
│  │ Jane Doe                   │ │
│  │ [View] [Schedule re-insp]  │ │
│  └────────────────────────────┘ │
│  ┌────────────────────────────┐ │
│  │ Risk move-in — John Smith │ │
│  │ Move-in in 3 days         │ │
│  │ [View] [Expedite review]  │ │
│  └────────────────────────────┘ │
│                                  │
│  🟡 ACTIONS (2)                  │
│  ┌────────────────────────────┐ │
│  │ 3 stale in screening       │ │
│  │ [View screening queue]     │ │
│  └────────────────────────────┘ │
│  ┌────────────────────────────┐ │
│  │ 2 ready to approve         │ │
│  │ [Review strong applicants] │ │
│  └────────────────────────────┘ │
│                                  │
│  ────────────────────────────    │
│  Sources: Priority Feed, NBA    │
│  Engine, Portfolio Insights     │
│  [Why this? ▼]                  │
│                                  │
│  [Ask another question...]       │
└──────────────────────────────────┘
```

### Applicant Detail Query

```
┌──────────────────────────────────┐
│  🤖 AI Copilot              [✕] │
├──────────────────────────────────┤
│                                  │
│  You asked: "Tell me about       │
│  Jane Doe"                       │
│                                  │
│  ────────────────────────────    │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Jane Doe                  │ │
│  │  jane@email.com            │ │
│  │  Score: 72/100 — Review    │ │
│  │                          │ │
│  │  Affordability: 2.8x       │ │
│  │  Status: Screening (10d)   │ │
│  │                          │ │
│  │  Risk Profile:             │ │
│  │  Fraud: 🟢 Low (5/100)    │ │
│  │  Payment: 🟡 Mod (35/100) │ │
│  │  Lease: 🟢 Low (15/100)   │ │
│  │  Docs: 🟡 Mod (42/100)    │ │
│  └────────────────────────────┘ │
│                                  │
│  ⚠ 2 red flags:                  │
│  • Income docs below threshold   │
│  • Screening score pending       │
│                                  │
│  🌀 Returning tenant:            │
│  Previously approved for         │
│  456 Oak Ave (2024-2025)         │
│  Payment history: 12 on-time     │
│                                  │
│  Suggested actions:               │
│  [Run background check]          │
│  [Request income docs]           │
│  [Send follow-up message]        │
│                                  │
│  ────────────────────────────    │
│  Sources: Scoring, Risk Intel,  │
│  Tenant Memory, NBA Engine      │
│  [Why this? ▼]                  │
└──────────────────────────────────┘
```

### Workflow Execution

```
┌──────────────────────────────────┐
│  🤖 AI Copilot              [✕] │
├──────────────────────────────────┤
│                                  │
│  You asked: "Send a follow-up    │
│  to Jane Doe"                    │
│                                  │
│  ────────────────────────────    │
│                                  │
│  I'll draft a follow-up message  │
│  for Jane regarding her          │
│  application status.             │
│                                  │
│  Subject: Quick check-in on      │
│  your application                │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Hi Jane,                   │ │
│  │                            │ │
│  │ Just checking in on your   │ │
│  │ application. We noticed    │ │
│  │ your screening has been    │ │
│  │ in progress for 10 days.   │ │
│  │                            │ │
│  │ To keep things moving,    │ │
│  │ please check your portal   │ │
│  │ for any outstanding items. │ │
│  │                            │ │
│  │ Best, Sarah                │ │
│  └────────────────────────────┘ │
│                                  │
│  [Edit] [Send] [Regenerate]     │
│                    ↕ Tone: Warm │
│                                  │
│  ────────────────────────────    │
│  Source: Communication           │
│  Assistant (follow_up template)  │
└──────────────────────────────────┘
```

### Explainability View

```
┌──────────────────────────────────┐
│  🤖 Why was this flagged?   [✕] │
├──────────────────────────────────┤
│                                  │
│  Rule: failed_inspection_stuck   │
│                                  │
│  This action was generated       │
│  because:                        │
│                                  │
│  Condition                       │
│  ✓ inspectionStatus = "Failed"   │
│  ✓ status = "Screening"          │
│    (not yet Rejected or Review)  │
│  ✓ 14 days since last update     │
│                                  │
│  Policy threshold                │
│  • Failed inspection must be     │
│    resolved within 7 days        │
│  • Current: 14 days overdue      │
│                                  │
│  Confidence: 100%                │
│  Priority: P0 (Urgent)           │
│                                  │
│  [Back to Copilot]               │
└──────────────────────────────────┘
```

## Query Examples by Intent

### Pipeline Summary

```
User: "How is my pipeline doing?"
Copilot: "Your pipeline has 24 applicants. 12 Strong, 8 Review, 4 Risk.
Average score is 72/100 (↑3% vs last week). 4 applicants need urgent
attention: 2 failed inspections and 2 risk applicants approaching
move-in dates."
[View pipeline] [Show urgent items]
```

### Next Actions

```
User: "What should I do first?"
Copilot: "I recommend starting with the 2 urgent items:
1. Jane Doe — Failed inspection, 14 days stuck. [Resolve]
2. John Smith — Risk applicant, move-in in 3 days. [Expedite]

After those, 3 applicants are stale in screening (7-14 days).
Would you like me to draft follow-ups?"
[Draft follow-ups] [View all actions]
```

### Risk Assessment

```
User: "Is Alice Brown risky?"
Copilot: "Alice has a Moderate overall risk profile (42/100):
- Payment: Elevated (55/100) — affordability ratio is 1.8x (below 2.5x threshold)
- Documentation: Moderate (35/100) — income docs are missing
- Fraud: Low (5/100) — no duplicate or suspicious signals detected

Her resident score of 620 is above your minimum threshold of 560.
The main concern is income documentation."
[Request income docs] [View full risk report]
```

### Workflow Shortcut

```
User: "Move the 3 New applicants to Screening"
Copilot: "I can move 3 applicants to Screening:
1. Mike Brown — has email + phone ✅ (safe to auto-move)
2. Lisa Wang — has email + phone ✅ (safe to auto-move)
3. Tom Jones — missing phone number ⚠️ (needs contact info)

I'll move Mike and Lisa now. Tom needs a phone number first.
[Move Mike & Lisa] [Request Tom's phone] [Skip]
```

### Comparison

```
User: "Who's the best applicant right now?"
Copilot: "Based on AI comparison, the strongest applicant is
Sarah Kim (92/100 — Strong). Top 3:
1. Sarah Kim — 92/100, 4.5x affordability
2. Mike Brown — 85/100, 3.8x affordability
3. Lisa Wang — 78/100, 3.2x affordability

Sarah has the highest score and strongest affordability in your pipeline."
[View comparison] [Approve Sarah]
```

### Explain Reasoning

```
User: "Why is Jane's inspection marked urgent?"
Copilot: "The failed_inspection_stuck rule triggered because:
- Inspection status: 'Failed' (requires action)
- Current status: 'Screening' (not yet resolved or rejected)
- Days since update: 14 (exceeds 7-day threshold)

This is P0 because a failed inspection blocks the application from
proceeding and creates legal risk if the applicant moves in without
a passed inspection."
[Show policy settings] [Resolve inspection]
```

## Suggestion Chip System

The Copilot proactively suggests follow-up queries based on context:

```typescript
function getContextualSuggestions(context: CopilotContext): SuggestionChip[] {
  const suggestions: SuggestionChip[] = [];

  // Page-based suggestions
  if (context.currentPage === "dashboard") {
    if (context.pipelineStatus.urgentCount > 0) {
      suggestions.push({
        label: "Show urgent items",
        query: "What urgent items need my attention?",
        priority: "high",
      });
    }
    if (context.pipelineStatus.staleCount > 0) {
      suggestions.push({
        label: "Show stale screening",
        query: "Which applicants are stuck in screening?",
        priority: "medium",
      });
    }
  }

  if (context.currentApplicantId) {
    suggestions.push(
      {
        label: "Risk assessment",
        query: "Is this applicant risky?",
        priority: "high",
      },
      {
        label: "Suggested actions",
        query: "What should I do with this applicant?",
        priority: "high",
      },
      {
        label: "Send message",
        query: "Draft a follow-up message",
        priority: "medium",
      },
    );
  }

  // Time-based suggestions
  if (context.timeOfDay === "morning") {
    suggestions.unshift({
      label: "Morning pipeline review",
      query: "What needs my attention today?",
      priority: "high",
    });
  }

  if (context.dayOfWeek === 1) {
    // Monday
    suggestions.push({
      label: "Weekly trends",
      query: "How did my pipeline change last week?",
      priority: "medium",
    });
  }

  return suggestions.sort((a, b) => a.priority.localeCompare(b.priority));
}
```

## System Prompt Architecture

### Copilot System Prompt

```typescript
const COPILOT_SYSTEM_PROMPT = `
You are an AI copilot for a property management platform called RentNinja.
Your job is to help property managers (landlords) manage their tenant
application pipeline.

You have access to the following data about the current user's portfolio:
- Pipeline metrics: {metrics}
- Urgent items: {urgentItems}
- Pending actions: {actions}
- Current page context: {currentPage}
- User preferences: {preferences}

Guidelines:
1. Be concise. Landlords are busy. 2-3 sentences max for summaries.
2. Be specific. Use actual numbers and names from the data.
3. Be actionable. Every response should include at least one suggested action.
4. Cite sources when making claims: "According to the scoring engine..."
5. Do not invent data. If you don't know, say so.
6. Do not give legal advice. Direct legal questions to "consult your attorney."
7. If the user asks something outside your capabilities, suggest what you CAN do.
8. Use the user's name if known: "Good morning, Sarah!"

Response format:
Return a JSON object with:
- message: string (the natural language response)
- suggestions: array of { label: string, query: string }
- actions: array of { label: string, actionType: string, data?: object }
- sources: array of { name: string, description: string }
`;
```

### Intent Classification Prompt

```typescript
const INTENT_CLASSIFICATION_PROMPT = `
Classify the user's query into one of these intents:
- pipeline_summary
- applicant_detail
- next_actions
- execute_action
- risk_assessment
- trend_question
- comparison
- document_request
- explain_reasoning
- tenant_history
- workflow_help
- unknown

Return: { intent: string, confidence: number, entities: object }

Entities to extract:
- applicantName: string (if a name is mentioned)
- actionType: string (if an action is requested: "approve", "move", "send", "schedule")
- propertyName: string (if a property is mentioned)
- timePeriod: string ("today", "this week", "this month")
`;
```

## Backend Integration

### Unified API Route

```typescript
// POST /api/copilot/query
// Body: { query: string, context?: CopilotContext }
// Response: CopilotResponse

export async function POST(request: Request) {
  const session = await auth();
  const { query, context } = await request.json();

  // 1. Classify intent
  const { intent, entities } = await classifyIntent(query);

  // 2. Enrich with session context
  const enrichedContext = await buildCopilotContext(session, context);

  // 3. Fetch data based on intent
  const data = await fetchDataForIntent(intent, entities, enrichedContext);

  // 4. Generate response
  const response = await generateCopilotResponse(data, enrichedContext);

  // 5. Audit
  await recordAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    action: "copilot.query",
    entityType: "copilot",
    message: `Copilot query: "${query}" → intent: ${intent}`,
    metadata: { query, intent, responseLength: response.message.length },
  });

  return NextResponse.json(response);
}
```

### Data Fetch by Intent

```typescript
async function fetchDataForIntent(
  intent: string,
  entities: Record<string, unknown>,
  context: CopilotContext,
): Promise<Record<string, unknown>> {
  switch (intent) {
    case "pipeline_summary":
      return {
        metrics: await getPortfolioMetrics(context.organizationId),
        urgent: await getUrgentItems(context.organizationId),
        trends: await getTrendData(context.organizationId),
      };

    case "applicant_detail":
      const applicant = await findApplicantByName(
        entities.applicantName as string,
        context.organizationId,
      );
      return {
        applicant,
        riskProfile: await getRiskProfile(applicant._id),
        tenantMemory: await getTenantMemory(applicant),
        actions: generateActionsForApplicant(applicant, context),
      };

    case "next_actions":
      return {
        pendingActions: await getAggregatedActions(context.organizationId),
        urgentItems: await getUrgentItems(context.organizationId),
        bottleneckReport: detectBottlenecks(context.pipelineStatus),
      };

    case "execute_action":
      return await executeCopilotAction(entities, context);

    case "risk_assessment":
      const riskApplicant = await findApplicantByName(
        entities.applicantName as string,
        context.organizationId,
      );
      return {
        applicant: riskApplicant,
        riskSignals: await getAllRiskSignals(riskApplicant),
        compositeProfile: computeCompositeRiskProfile(riskApplicant),
      };

    default:
      return {
        message:
          "I'm not sure how to help with that. Try asking about your pipeline, applicants, or what needs attention.",
      };
  }
}
```

## Existing Code That Already Powers the Copilot

| Existing System                            | Copilot Usage                                                        |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `lib/action-engine.ts`                     | Generates "next_actions" and "execute_action" responses              |
| `lib/ai-operations.ts`                     | Provides "pipeline_summary" and bottleneck data                      |
| `lib/risk-intelligence.ts` (proposed)      | Powers "risk_assessment" and "applicant_detail" risk profiles        |
| `lib/scoring.ts`                           | Supplies scores, decisions, red flags for applicant queries          |
| `lib/feedback-engine.ts`                   | Provides accuracy data for "explain_reasoning" confidence            |
| `lib/ai-operations.ts`                     | Detects "trend_question" patterns from portfolio data                |
| `lib/ai-types.ts`                          | Zod schemas for structured Copilot response validation               |
| `lib/openai.ts`                            | `createStructuredOpenAIResponse()` — generates all Copilot responses |
| `lib/audit-log.ts`                         | `recordAuditLog()` — audits every Copilot query                      |
| `components/dashboard/applicant-list.tsx`  | Applicant data display — rendered inline in Copilot responses        |
| `components/dashboard/action-card.tsx`     | Action buttons embedded in Copilot response cards                    |
| `components/dashboard/priority-feed.tsx`   | Feed items shown in "next_actions" responses                         |
| `components/dashboard/override-dialog.tsx` | Override flow accessible from Copilot actions                        |
| `docs/ai-memory-personalization.md`        | User preferences shape Copilot tone and suggestion priority          |

## Key Files (Proposed)

| File                                            | Purpose                                                                    |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| `components/copilot/copilot-panel.tsx`          | Slide-over panel with input, response rendering, suggestion chips          |
| `components/copilot/copilot-button.tsx`         | Fixed bottom-right trigger button with unread indicator                    |
| `components/copilot/copilot-response.tsx`       | Renders structured CopilotResponse with actions, sources, explainability   |
| `components/copilot/copilot-explainability.tsx` | Expandable "Why this?" reasoning view                                      |
| `lib/copilot-engine.ts`                         | Intent classification, context building, data fetching, response synthesis |
| `lib/copilot-prompts.ts`                        | System prompts, intent classification prompt, response format definitions  |
| `app/api/copilot/query/route.ts`                | POST — accept query, route to intent handler, return CopilotResponse       |

## Fulfillment Table

| Requirement                   | How It's Met                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Natural language queries**  | Intent classification pipeline routes free-form questions to 12 intent handlers. OpenAI structured responses generate human-like answers with citations.                                   |
| **Operational summaries**     | `pipeline_summary` intent aggregates portfolio metrics, urgent items, and trend data into a 2-3 sentence narrative with metric cards.                                                      |
| **Workflow shortcuts**        | `execute_action` intent maps natural language to action API calls: "Move Jane to Screening" → PATCH action API. Communication drafts generated via communication assistant.                |
| **Recommendations**           | `next_actions` intent fetches aggregated NBA engine actions + operational inbox items, sorted by P0→info priority. Shown as actionable cards inline.                                       |
| **Tenant/applicant insights** | `applicant_detail` intent combines scoring data, risk intelligence signals, tenant memory history, and NBA-suggested actions into a single unified profile view.                           |
| **Explainable reasoning**     | `explain_reasoning` intent surfaces the rule, condition, facts, and policy threshold that triggered any NBA action. Rendered in a structured "Why this?" panel with confidence and source. |
