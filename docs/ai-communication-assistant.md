# AI Communication Assistant — Design Document

## Overview

The AI Communication Assistant reduces the communication overhead of property management by generating professional, context-aware message drafts for common landlord-tenant interactions. It eliminates the friction of composing follow-ups, document requests, and decision explanations from scratch — while keeping the human in the loop with editable drafts, tone control, and a safe approval flow.

## Capabilities

| Capability                          | Description                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Follow-up drafts**                | Generate polite check-in messages for applicants stuck in screening, pending documentation, or approaching deadlines      |
| **Missing document requests**       | Draft emails requesting specific missing items (pay stubs, ID, references, inspection docs) with clear instructions       |
| **Applicant decision explanations** | Generate approve/decline messages that explain the outcome grounded in screening policy while staying legally appropriate |
| **Lease renewal reminders**         | Draft renewal offer messages with key dates, rent adjustments, and action links                                           |
| **Payment reminders**               | Generate rent due / past due notifications with amounts, dates, and payment links                                         |

## Design Principles

1. **Drafts, not sent messages** — AI generates a draft. The user always reviews and edits before sending. Never auto-sends.
2. **Tone-controlled** — User selects tone per draft: Professional, Warm, or Direct. Each tone adjusts language, formality, and length.
3. **Explainable** — Drafts include a "Why this was generated" panel showing the triggering rule, applicant facts, and policy applied — mirroring the NBA explainability model.
4. **Safe approval flow** — Messages are reviewed in a message composer UI with edit capability before any external delivery.
5. **Context-aware** — Drafts incorporate applicant-specific data (name, dates, scores, red flags, action history) so the user doesn't need to copy-paste.
6. **Audit trail** — Every generated draft and sent message is logged for compliance and dispute resolution.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                  AI Communication Assistant                          │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │ Trigger     │  │ Template +   │  │ Composer    │  │ Delivery │  │
│  │ Detection   │→ │ AI Draft Gen │→ │ (Edit UI)   │→ │ (Manual) │  │
│  │             │  │              │  │             │  │          │  │
│  │ • NBA rules │  │ • OpenAI     │  │ • Editable  │  │ • Copy   │  │
│  │ • Schedule  │  │ • Tone:      │  │ • Preview   │  │ • Email  │  │
│  │ • Manual    │  │   prof/warm  │  │ • Tone      │  │ • SMS    │  │
│  │             │  │   /direct    │  │   selector  │  │   (fut.) │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └──────────┘  │
│         │                │                 │                        │
│         ▼                ▼                 ▼                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Data & Audit Layer                       │   │
│  │  ┌────────────┐  ┌───────────┐  ┌──────────────────────┐   │   │
│  │  │ Applicant  │  │ AuditLog  │  │ CommunicationHistory │   │   │
│  │  │ data +     │  │ (actor,   │  │ (messageId, status,  │   │   │
│  │  │ action ctx │  │  entity)  │  │  sentAt, recipient)  │   │   │
│  │  └────────────┘  └───────────┘  └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Existing AI Infrastructure (lib/openai.ts)                         │
│  createStructuredOpenAIResponse(input, schemaName, schema, ...)     │
│    • Uses gpt-4o-mini with structured JSON output                   │
│    • Sanitization via sanitizeAiText()                              │
│    • Rate limited (20 req/min user, 10 req/min IP)                  │
│    • Audit logging via recordAuditLog()                             │
└──────────────────────────────────────────────────────────────────────┘
```

## Trigger Sources

Messages can be triggered from any of these paths:

### 1. NBA Engine Action (Primary)

When the NBA engine detects an action that benefits from a message draft, the Communication Assistant is offered alongside the action card.

| NBA Action                   | Suggested Message Type                                     |
| ---------------------------- | ---------------------------------------------------------- |
| `new_applicant_needs_intake` | Follow-up: Welcome + intake instructions                   |
| `followup_screening`         | Follow-up: Checking in on screening progress               |
| `verify_subsidy`             | Request: Supporting documents for subsidy verification     |
| `verify_income_docs`         | Request: Income documentation (pay stubs, tax returns)     |
| `request_contact_info`       | Request: Missing contact details                           |
| `request_coapplicant_info`   | Request: Co-applicant contact info                         |
| `approve_applicant`          | Decision: Approval notification + next steps               |
| `resolve_failed_inspection`  | Decision: Inspection failure explanation + reschedule info |
| `expedite_risk_review`       | Decision: Application status update                        |
| `schedule_inspection`        | Request: Inspection scheduling                             |

### 2. Manual Trigger

User navigates to an applicant, clicks "Compose message", selects a template type, and clicks "Generate draft". The assistant pulls the applicant's context and generates the draft in-place.

### 3. Scheduled Trigger (Future)

Cron job checks for:

- Applicants approaching lease end → renewal reminder
- Applicants with overdue rent → payment reminder

## Message Types

### Follow-up Draft

```
Subject: Quick check-in on your application — {property}

Hi {name},

I wanted to touch base regarding your application for {propertyAddress}. We're
currently reviewing your paperwork and noticed that {triggerReason}.

To keep things moving, please {suggestedAction} by {date}.

If you have any questions, feel free to reply to this email.

Best regards,
{user.name}
{organization.name}
```

### Missing Document Request

```
Subject: Additional documents needed for your application

Hi {name},

Thank you for applying to {propertyAddress}. To complete your application,
we need the following document(s):

{list of missing items}

Please upload them via {portalLink} by {date}. Once received, we'll continue
with the screening process.

Thanks,
{user.name}
```

### Decision Explanation

```
Subject: Update on your application for {propertyAddress}

Hi {name},

After reviewing your application, we have made a decision:

{decision}: {decisionReason}

{personalized note based on applicant data}

{next steps if approved, or polite closing if declined}

Sincerely,
{user.name}
```

### Lease Renewal Reminder

```
Subject: Your lease renewal at {propertyAddress}

Hi {name},

Your current lease at {propertyAddress} is set to expire on {leaseEndDate}.

We'd love to have you stay! Your renewal offer includes:
  • Monthly rent: {newRent} (adjusted from {currentRent})
  • Lease term: {termLength}

To renew, please {actionRequired} by {deadline}.

Let me know if you have any questions.

Best,
{user.name}
```

### Payment Reminder

```
Subject: Rent payment reminder — {propertyAddress}

Hi {name},

This is a friendly reminder that your rent of {amount} for {propertyAddress}
was due on {dueDate}.

Current status: {status}
Amount due: {amountDue}
Late fee (if applicable): {lateFee}

You can pay securely at {paymentLink}.

Thank you,
{user.name}
```

## Draft Generation System

### Prompt Template Architecture

Each message type has a system prompt that instructs the AI on structure, tone, and data boundaries:

```typescript
interface MessageDraftRequest {
  messageType:
    | "follow_up"
    | "document_request"
    | "decision"
    | "renewal"
    | "payment";
  tone: "professional" | "warm" | "direct";
  applicant: {
    name: string;
    propertyAddress: string;
    moveInDate?: string;
    status: string;
    decision?: string;
    totalScore?: number;
    redFlags: string[];
    scores?: Record<string, number>;
    coApplicants?: Array<{ name: string }>;
    housingSupport?: string;
  };
  context: {
    triggerReason: string;
    suggestedAction: string;
    missingItems?: string[];
    leaseEndDate?: string;
    currentRent?: number;
    newRent?: number;
    paymentStatus?: string;
    amountDue?: number;
    dueDate?: string;
    lateFee?: number;
    paymentLink?: string;
  };
  user: {
    name: string;
    organizationName: string;
  };
}
```

### Tone Mapping

| Tone         | System Prompt Prefix                                                                                   | Characteristics                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Professional | "Write a professional, courteous message. Use standard business letter conventions."                   | Neutral, clear, structured. Suitable for all situations. Default.                                  |
| Warm         | "Write a warm, personable message. Use a friendly and approachable tone while remaining professional." | Conversational, empathetic. Best for renewals, welcome messages, and positive decisions.           |
| Direct       | "Write a direct, concise message. Get to the point quickly. Use clear, unambiguous language."          | Short, factual, no pleasantries. Best for payment reminders, deadline notifications, and declines. |

### System Prompt Per Message Type

```typescript
const SYSTEM_PROMPTS: Record<string, string> = {
  follow_up: `
You are a leasing assistant drafting a follow-up message to a tenant applicant.
The message should be {tone} in tone.
Do not invent facts not provided in the context.
Keep the message under 150 words.
Include a clear call to action with the suggested action and timeline.
Sign off with the user's name and organization.
  `.trim(),

  document_request: `
You are a leasing assistant drafting a document request to a tenant applicant.
List each missing document clearly.
Explain why each document is needed (e.g., "to verify income").
Set a reasonable deadline (3-5 business days from today).
Do not share the applicant's internal score or red flags.
Keep the message under 200 words.
  `.trim(),

  decision: `
You are a leasing assistant drafting a decision notification to a tenant applicant.
If the decision is positive, focus on next steps and welcome them.
If the decision is negative, be polite and avoid sharing specific score breakdowns or red flags.
Do not use language that could be construed as discriminatory.
Reference fair housing principles when appropriate.
Keep the message under 150 words.
  `.trim(),

  renewal: `
You are a leasing assistant drafting a lease renewal offer to a current tenant.
Clearly state the current rent, the new rent (if changing), and the lease term.
Include a deadline for response (typically 30 days before lease end).
Make the tenant feel valued and appreciated.
Keep the message under 150 words.
  `.trim(),

  payment: `
You are a leasing assistant drafting a payment reminder to a tenant.
State the amount due, the due date, and any late fees clearly.
Provide the payment link or instructions.
If this is a past-due notice, use slightly firmer language while remaining professional.
Keep the message under 120 words.
  `.trim(),
};
```

### OpenAI Integration

The generation uses the existing `createStructuredOpenAIResponse()` from `lib/openai.ts`:

```typescript
async function generateMessageDraft(request: MessageDraftRequest): Promise<{
  subject: string;
  body: string;
}> {
  return createStructuredOpenAIResponse({
    schemaName: "message_draft",
    schemaDescription: `A ${request.tone} ${request.messageType} message to a tenant applicant.`,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "body"],
      properties: {
        subject: { type: "string", maxLength: 100 },
        body: { type: "string", maxLength: 2000 },
      },
    },
    input: [
      {
        role: "system",
        content: SYSTEM_PROMPTS[request.messageType].replace(
          "{tone}",
          request.tone,
        ),
      },
      {
        role: "user",
        content: JSON.stringify({
          applicant: request.applicant,
          context: request.context,
          user: request.user,
        }),
      },
    ],
  });
}
```

## UI Interaction Model

### Message Composer (Modal / Slide-over)

```
┌──────────────────────────────────────────────────────────────┐
│  Compose Message                            ✕ Close          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Recipient: Jane Doe  <jane@example.com>                     │
│                                                              │
│  Template:  [Follow-up ▼]    Tone:  [Warm ▼]  [↻ Regenerate]│
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Subject: Quick check-in on your application — 123 Main │  │
│  │                                                        │  │
│  │ Hi Jane,                                               │  │
│  │                                                        │  │
│  │ I wanted to touch base regarding your application for  │  │
│  │ 123 Main St. We noticed your screening has been in     │  │
│  │ progress for 10 days.                                  │  │
│  │                                                        │  │
│  │ To keep things moving, please check your portal for    │  │
│  │ any outstanding items.                                 │  │
│  │                                                        │  │
│  │ Best regards,                                          │  │
│  │ Sarah (RentNinja Properties)                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🔍 Why this message was generated                     │  │
│  │ Rule: followup_screening                              │  │
│  │ Applicant "Screening" for 10 days (threshold: 7)     │  │
│  │ Confidence: 90%  |  Tone: Warm                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [Copy to clipboard]  [Save as draft]  [Mark as sent]        │
└──────────────────────────────────────────────────────────────┘
```

### Integration Points

The composer is accessible from:

1. **ActionCard** — Each action card has a "📝 Draft message" button that opens the composer pre-filled with the relevant message type
2. **Applicant detail** — A "Compose" button in the applicant card opens the composer with a template selector
3. **Priority Feed** — Automation tips that involve communication show "📝 Draft" as the action link

## Explainability Panel

Each generated draft includes an explainability section (collapsible, mirroring FactTrail):

```typescript
interface DraftExplainability {
  triggerRule: string;
  triggerDescription: string;
  applicantFacts: Record<string, unknown>;
  policyThreshold?: Record<string, unknown>;
  confidence: number;
  toneSelected: string;
  generationTimeMs: number;
}
```

**Example:**

```
Why this message was generated:
  Rule: followup_screening
  "Screening" status for 10 days without update (threshold: 7 days)
  Facts considered:
    • status: "Screening"
    • daysSinceUpdate: 10
    • updatedAt: 2026-04-29
  Confidence: 90% (High)
  Tone: Warm
```

## Safe Approval Flow

### Stage 1: Generate (Always free)

User clicks "Generate" → AI produces draft → user can edit freely, regenerate, or discard.

### Stage 2: Review & Edit (Mandatory)

The composer opens with the draft in an editable text area. User must:

1. Read the draft
2. Optionally edit subject line, body, or tone
3. Optionally regenerate with a different tone

### Stage 3: Confirm Send (Explicit action)

User clicks one of:

- **"Copy to clipboard"** — User can paste into their email client. No server-side sent record.
- **"Save as draft"** — Saved to CommunicationHistory with status `draft`. Editable later.
- **"Mark as sent"** — Logs to CommunicationHistory with status `sent`. Adds audit log entry. User confirms they actually sent it.

### Stage 4: Audit (Automatic)

Every generate, edit, and send action is audited:

| Event           | Audit Action           | Data                                           |
| --------------- | ---------------------- | ---------------------------------------------- |
| Draft generated | `comm.draft_generated` | messageType, tone, applicantId, characterCount |
| Draft edited    | `comm.draft_edited`    | editCount (aggregated)                         |
| Draft saved     | `comm.draft_saved`     | messageType, applicantId                       |
| Message sent    | `comm.message_sent`    | messageType, tone, recipient, characterCount   |

### Stage 5: No Auto-Send

The system NEVER auto-sends messages. All delivery is manual via clipboard copy or external email client. This ensures:

- User reviews every message
- No accidental communications liability
- Compliance with fair housing documentation practices
- User can customize before delivery

## Communication History Model

```typescript
interface CommunicationRecord {
  _id: string;
  organizationId: string;
  applicantId: string;
  messageType:
    | "follow_up"
    | "document_request"
    | "decision"
    | "renewal"
    | "payment";
  tone: "professional" | "warm" | "direct";
  status: "draft" | "sent";
  subject: string;
  body: string;
  recipientEmail: string;
  recipientName: string;
  generatedByUserId: string;
  generatedAt: Date;
  editedAt?: Date;
  editCount: number;
  sentAt?: Date;
  triggerActionId?: string; // Links to the NBA action that generated this
  explainability: DraftExplainability;
  metadata: Record<string, unknown>;
}
```

## Proposed API Routes

### POST /api/ai/communications/generate

Generate a message draft.

**Request:**

```json
{
  "messageType": "follow_up",
  "tone": "warm",
  "applicantId": "abc123",
  "context": {
    "triggerActionId": "action_456",
    "triggerReason": "Screening for 10 days",
    "suggestedAction": "Check portal for outstanding items"
  }
}
```

**Response (200):**

```json
{
  "draft": {
    "subject": "Quick check-in on your application — 123 Main St",
    "body": "Hi Jane, ..."
  },
  "explainability": {
    "triggerRule": "followup_screening",
    "triggerDescription": "Screening status for 10 days",
    "applicantFacts": { "status": "Screening", "daysSinceUpdate": 10 },
    "confidence": 90,
    "toneSelected": "warm",
    "generationTimeMs": 842
  },
  "characterCount": 312
}
```

### PATCH /api/ai/communications/save

Save a draft or mark as sent.

**Request:**

```json
{
  "applicantId": "abc123",
  "messageType": "follow_up",
  "status": "sent",
  "subject": "Quick check-in...",
  "body": "Hi Jane, ...",
  "tone": "warm",
  "recipientEmail": "jane@example.com",
  "triggerActionId": "action_456"
}
```

### GET /api/ai/communications/:applicantId

Get communication history for an applicant (for the "Past messages" tab).

## Integration with Existing Systems

### With NBA Engine (lib/action-engine.ts)

When an action is generated that has a corresponding message type, the API response includes a `messageType` hint. The UI shows a "📝 Draft message" button on the ActionCard.

### With Operational Inbox (lib/ai-operations.ts)

Messages that have been drafted but not sent appear as P2 items in the Priority Feed:

```
📝 2 unsent draft messages for Jane Doe, John Smith
```

### With Audit Log (lib/audit-log.ts)

All generation and send events write to AuditLog using the existing `recordAuditLog()` function with action prefix `comm.`.

### With OpenAI (lib/openai.ts)

Uses the existing `createStructuredOpenAIResponse()` with schema validation, sanitization, and error handling.

## Tone Control Details

| Tone             | Style Guide                                                                                                                            | Best For                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Professional** | Use standard business letter structure. Full salutation and sign-off. Avoid contractions. Third-person references to the organization. | Decision notifications, document requests, formal communications |
| **Warm**         | Use first-name salutation. Personalize with relevant details. Conversational but still structured. Contractions allowed.               | Welcome messages, renewal offers, positive follow-ups            |
| **Direct**       | Short paragraphs. Imperative sentences. Minimal pleasantries. Bold or all-caps sparingly for deadlines/amounts.                        | Payment reminders, deadline warnings, negative decisions         |

## Draft Memory & Improvement

Each time a user edits a draft and saves/sends it, the edit delta is logged (without storing the full message body in a way that violates privacy). Over time, the system can learn:

1. **Most-edited sections** — If users consistently rewrite the opening paragraph, the prompt can be tuned.
2. **Tone preference** — If a user always switches a "Professional" draft to "Warm", the default tone auto-adjusts.
3. **Message type usage** — Follow-ups and document requests may be used daily; renewals seasonally.

This data feeds a "personalization score" that adjusts the base prompt subtly per user (future enhancement).

## Key Files (Proposed)

| File                                                 | Purpose                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `lib/communication-assistant.ts`                     | Draft generation, schema definitions, prompt templates, tone mapping |
| `models/CommunicationRecord.ts`                      | Mongoose schema for communication history                            |
| `app/api/ai/communications/generate/route.ts`        | POST — generate draft via OpenAI                                     |
| `app/api/ai/communications/save/route.ts`            | PATCH — save draft or mark as sent                                   |
| `app/api/ai/communications/[applicantId]/route.ts`   | GET — fetch communication history                                    |
| `components/communications/message-composer.tsx`     | Editable composer UI with tone selector and explainability           |
| `components/communications/explainability-panel.tsx` | Collapsible "Why this message" section                               |
| `components/dashboard/action-card.tsx`               | Enhancement: add "📝 Draft message" button                           |

## Fulfillment Table

| Requirement                     | How It's Met                                                                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Generate follow-up drafts**   | NBA engine triggers → `messageType: "follow_up"` → AI generates draft with applicant context and suggested action                                                          |
| **Request missing documents**   | NBA action `verify_income_docs`, `verify_subsidy` etc. → `messageType: "document_request"` → lists specific missing items                                                  |
| **Explain applicant decisions** | NBA action `approve_applicant`, `resolve_failed_inspection` → `messageType: "decision"` → explains outcome grounded in screening policy without disclosing internal scores |
| **Lease renewal reminders**     | Future scheduled trigger → `messageType: "renewal"` → includes current rent, new rent, term, deadline                                                                      |
| **Payment reminders**           | Future scheduled trigger → `messageType: "payment"` → amount, due date, late fees, payment link                                                                            |
| **Editable drafts**             | MessageComposer UI with editable subject/body text areas, tone dropdown, regenerate button                                                                                 |
| **Tone control**                | User selects "Professional", "Warm", or "Direct". Each tone has a distinct system prompt prefix and style guide                                                            |
| **Explainability**              | Collapsible panel shows trigger rule, applicant facts, policy thresholds, confidence, generation time                                                                      |
| **Safe approval flow**          | 5-stage flow: generate → review & edit → explicit action (copy/save/send) → audit → no auto-send ever                                                                      |
