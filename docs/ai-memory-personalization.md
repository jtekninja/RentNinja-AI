# AI Memory + Personalization — Design Document

## Overview

The AI Memory & Personalization system enables the application to learn from every interaction and adapt its behavior to each landlord's unique preferences, approval patterns, and workflow habits. Instead of treating all users identically, the system builds per-user and per-organization models that tune NBA rules, risk thresholds, tone preferences, automation settings, and communication templates to match how each landlord actually works.

## What the App Should Learn

| Learning Domain          | Current State                                                                    | Target State                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Landlord preferences** | All users get the same NBA rules, same confidence thresholds, same tone defaults | Each landlord's settings, filter preferences, and display choices persist and adapt                                             |
| **Approval behavior**    | No tracking of what types of applicants a landlord tends to approve vs reject    | System learns a landlord's personal "approval profile" and surfaces applicants matching their historical preferences            |
| **Tenant patterns**      | No tenant-level tracking across applications                                     | System identifies repeat applicants, portfolio-level tenant quality patterns, and lease compliance trends                       |
| **Workflow habits**      | No learning from action outcomes                                                 | System learns which NBA actions the landlord accepts/skips/overrides most often and adjusts priority and confidence accordingly |

## Design Principles

1. **Implicit learning is primary** — The system learns from natural user behavior (accepting actions, editing drafts, setting filters) without requiring explicit configuration. Every click is a signal.
2. **Explicit feedback reinforces** — Feedback buttons (positive/negative/neutral) on action history provide explicit reinforcement. Implicit signals (accept vs skip) provide day-to-day learning.
3. **Per-user + per-organization models** — Individual preferences (tone, filters, dashboard layout) are per-user. Approval behavior and risk tolerance are per-organization.
4. **Privacy-preserving by design** — Personalization models are isolated per organization. No cross-organization learning. No sensitive data leaves the organization boundary.
5. **Decay and recency** — Older behavior is weighted less than recent behavior. A landlord who used to accept "approve_applicant" actions but now skips them — the system learns the new pattern within 7 days.
6. **Explainable personalization** — When the system adapts behavior (e.g., changes a default tone or adjusts a confidence score), it surfaces why: "Based on your last 15 actions, you prefer Warm tone for follow-ups."

## Current Learning Signals

The codebase already captures the following data that can feed into a memory model:

### 1. Action Outcomes (Already Stored — `ApplicantAction` model)

```typescript
status: "accepted" | "skipped" | "overridden" | "auto_applied";
outcome: "positive" | "negative" | "neutral" | null;
outcomeNote: string | null;
overrideReason: string | null;
actedByUserId: ObjectId; // Who acted
actedAt: Date; // When
actionType: string; // What action
priority: "P0" | "P1" | "P2" | "info";
```

### 2. Audit Log (Already Stored — `AuditLog`)

```typescript
action: "action.accepted" |
  "action.skipped" |
  "action.overridden" |
  "action.feedback" |
  "actions.generated";
organizationId: ObjectId;
actorUserId: ObjectId;
metadata: {
  (actionType, applicantId, outcome, overrideReason, autoApplied);
}
```

### 3. Feedback Engine Accuracy (Already Stored — Aggregated)

```typescript
// computeHistoricalAccuracy() produces per-actionType accuracy
// Positive outcome = 1.0, Neutral = 0.5, Negative = 0.0
// Blended into NBA confidence calculation
```

### 4. NBA Action History (Available for Query)

```typescript
// Per actionType: accepted count, skipped count, overridden count
// Per priority level: resolution rate, average time-to-act
// Per user: action resolution patterns
```

## What's Missing (New Data Sources Needed)

| Data Point                | Why Needed                                                                                        | Where Stored                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| User filter preferences   | Learn which decision filters, property filters, and sorts the landlord prefers                    | `UserPreferences` model                           |
| User tone preferences     | Learn which communication tone (professional/warm/direct) the landlord selects per message type   | `UserPreferences.tonePreferences`                 |
| User auto-approve pattern | Learn at what confidence threshold the landlord actually accepts actions vs requiring more review | Computed from action history                      |
| User override reasons     | Categorize override reasons to identify policy disagreements                                      | `overrideReason` — needs categorization           |
| User draft edit patterns  | Learn which parts of AI-generated drafts the user edits most                                      | `CommunicationRecord.editCount`, `editedSections` |
| Tenant repeat application | Track applicants across time, even if their data changes                                          | `TenantFingerprint` model                         |
| Lease compliance data     | Track tenant lease compliance post-approval                                                       | `LeaseRecord` model                               |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI Memory & Personalization                      │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Signal Collection Layer                                        │  │
│  │                                                                  │  │
│  │  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ Action       │ │ Feedback │ │ Filter / │ │ Audit Log    │  │  │
│  │  │ Accept/Skip  │ │ Positive │ │ Sort     │ │ Events       │  │  │
│  │  │ Override     │ │/Negative │ │ Choices  │ │              │  │  │
│  │  └──────────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                           │                                             │
│                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Memory Model Layer (Stored in DB)                              │  │
│  │                                                                  │  │
│  │  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────┐ │  │
│  │  │ UserPreferences │ │ Organization     │ │ TenantMemory     │ │  │
│  │  │                 │ │ LearningModel    │ │                  │ │  │
│  │  │ • tone          │ │                  │ │ • fingerprints   │ │  │
│  │  │ • filters       │ │ • approval       │ │ • past apps      │ │  │
│  │  │ • sort prefs    │ │   profile        │ │ • lease status   │ │  │
│  │  │ • default view  │ │ • risk tolerance │ │ • payment hist   │ │  │
│  │  │ • NBA thresholds│ │ • auto pref      │ │ • communication  │ │  │
│  │  │ • dismissed msgs│ │ • override cats  │ │ • patterns       │ │  │
│  │  └─────────────────┘ └──────────────────┘ └──────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                           │                                             │
│                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Personalization Application Layer                              │  │
│  │                                                                  │  │
│  │  ┌────────────────┐ ┌─────────────────┐ ┌───────────────────┐  │  │
│  │  │ NBA Confidence │ │ Communication   │ │ Risk Threshold   │  │  │
│  │  │ Calibration    │ │ Tone Selection  │ │ Adaptation       │  │  │
│  │  │                │ │                 │ │                  │  │  │
│  │  │ • per-action   │ │ • per-user      │ │ • per-org        │  │  │
│  │  │   shift        │ │   default tone  │ │   decision       │  │  │
│  │  │ • frequency    │ │ • per-message   │ │   boundary       │  │  │
│  │  │   penalty      │ │   type override │ │   adjustment     │  │  │
│  │  │ • skip learning │ │ • auto-detect   │ │ • flag severity  │  │  │
│  │  └────────────────┘ └─────────────────┘ └───────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Memory Models

### 1. UserPreferences Model

```typescript
interface UserPreferences {
  userId: string;
  organizationId: string;

  // Communication
  tonePreferences: {
    follow_up: "professional" | "warm" | "direct";
    document_request: "professional" | "warm" | "direct";
    decision: "professional" | "warm" | "direct";
    renewal: "professional" | "warm" | "direct";
    payment: "professional" | "warm" | "direct";
  };

  // Dashboard
  defaultSection: "overview" | "new" | "billing" | "all";
  defaultDecisionFilter: "All" | "Strong" | "Review" | "Risk";
  defaultSortBy: "newest" | "highest-score" | "highest-affordability";
  defaultPropertyFilter: string; // "All properties" or specific

  // NBA
  autoExpandActions: boolean;
  minConfidenceToShow: number; // User can filter out low-confidence actions
  dismissedInsightIds: string[]; // Dismissed portfolio insights

  // Schedule
  preferredWeeklyReportDay: 1 | 2 | 3 | 4 | 5 | 6 | 0; // 0=Sunday
  dailyDigestEnabled: boolean;

  // Draft memory
  lastUsedTone: "professional" | "warm" | "direct";
  lastMessageType: string;

  updatedAt: Date;
}
```

### 2. OrganizationLearningModel

```typescript
interface OrganizationLearningModel {
  organizationId: string;

  // Approval Behavior Profile
  approvalProfile: {
    totalDecisions: number;
    approveRate: number;
    reviewRate: number;
    rejectRate: number;
    avgScoreThreshold: number; // What avg score does this org typically approve?
    minAffordabilityObserved: number; // Minimum affordability ratio they've accepted
    maxRiskTolerance: number; // Highest risk score they've accepted
  };

  // Per-Action-Type Learning
  actionTypeStats: Record<
    string,
    {
      actionType: string;
      generatedCount: number;
      acceptedCount: number;
      skippedCount: number;
      overriddenCount: number;
      autoAppliedCount: number;
      avgConfidenceWhenAccepted: number;
      avgConfidenceWhenSkipped: number;
      avgConfidenceWhenOverridden: number;
      positiveFeedbackCount: number;
      negativeFeedbackCount: number;
      lastGeneratedAt: Date;
      lastActedAt: Date | null;
    }
  >;

  // Override Reason Categories
  overrideCategories: Record<string, number>; // "Not relevant" → 12, "Wrong timing" → 5, etc.

  // Risk Tolerance Calibration
  riskTolerance: {
    // Computed from approval behavior
    effectiveMinAffordability: number; // The ratio they actually enforce
    effectiveMinResidentScore: number; // The score they actually accept
    effectiveStrongThreshold: number; // The score they consider "Strong"
    effectiveReviewThreshold: number; // The score they consider "Review"
    redFlagTolerance: Record<string, number>; // Per-red-flag acceptance rate
  };

  // Tenant Pattern Memory
  knownTenants: Record<string, TenantMemoryEntry>;

  // Workflow Habit Scores
  workflowHabits: {
    averageResponseTimeHours: number; // How fast they act on NBA items
    preferredWorkHours: [number, number]; // [startHour, endHour] UTC
    batchActionPreference: number; // 0-100: do they act on items one-by-one or batch?
    actionResolutionRate: number; // % of generated actions that get acted upon
  };

  updatedAt: Date;
}
```

### 3. TenantMemory Model

```typescript
interface TenantMemoryEntry {
  tenantId: string; // Stable fingerprint across applications
  knownIdentifiers: {
    emails: string[];
    phones: string[];
    names: string[];
    fingerprints: string[]; // From duplicateFingerprint
  };

  // Application history
  pastApplications: Array<{
    applicationId: string;
    date: Date;
    propertyAddress: string;
    decision: "Strong" | "Review" | "Risk";
    status: "Approved" | "Rejected";
    totalScore: number;
    redFlags: string[];
    housingSupport: string;
  }>;

  // Lease history (if approved)
  leaseHistory: Array<{
    leaseId: string;
    propertyAddress: string;
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    paymentHistory: {
      onTime: number;
      late: number;
      missed: number;
      lastLateDate: Date | null;
    };
    complaints: number;
    leaseViolations: number;
    renewalStatus: "renewed" | "not_renewed" | "active";
  }>;

  // Communication history
  communicationCount: number;
  positiveInteractions: number;
  negativeInteractions: number;
  lastCommunicationDate: Date | null;

  // Risk score
  tenantRiskScore: number; // 0-100, computed from history
  tenantRiskConfidence: number; // 0-100, increases with more data

  updatedAt: Date;
}
```

## Learning Mechanisms

### 1. Implicit Learning: Action Resolution Patterns

**What is learned:** Which NBA actions this landlord finds useful vs. noise.

**How it works:**

```typescript
// Every time a landlord Accepts / Skips / Overrides an action:
function learnFromActionResolution(action: ActionRecord) {
  const stats = orgLearningModel.actionTypeStats[action.actionType];
  stats.generatedCount++;

  if (action.status === "accepted") stats.acceptedCount++;
  if (action.status === "skipped") stats.skippedCount++;
  if (action.status === "overridden") stats.overriddenCount++;

  // Track confidence at resolution
  if (action.status === "accepted") {
    stats.avgConfidenceWhenAccepted =
      (stats.avgConfidenceWhenAccepted * (stats.acceptedCount - 1) +
        action.confidence) /
      stats.acceptedCount;
  }

  // Decay: Older actions lose weight
  // Apply 5% decay to counts older than 30 days
  applyDecay(stats);
}
```

**Applied to:** NBA confidence calibration — action types with high skip rates get confidence penalties, action types with high accept rates get confidence boosts.

### 2. Implicit Learning: Approval Boundary Detection

**What is learned:** What score thresholds and risk factors this landlord actually acts on.

**How it works:**

```typescript
// Track every applicant resolution with their scores and the outcome
function learnApprovalBoundaries(applicant: ApplicantRecord, decision: string) {
  const profile = orgLearningModel.approvalProfile;
  profile.totalDecisions++;

  if (decision === "Approved") {
    profile.approveRate =
      (profile.approveRate * (profile.totalDecisions - 1) + 1) /
      profile.totalDecisions;
    // Track observed thresholds
    if (applicant.affordabilityRatio > 0) {
      profile.minAffordabilityObserved = Math.min(
        profile.minAffordabilityObserved || Infinity,
        applicant.affordabilityRatio,
      );
    }
  } else if (decision === "Rejected") {
    profile.rejectRate =
      (profile.rejectRate * (profile.totalDecisions - 1) + 1) /
      profile.totalDecisions;
  }
}
```

**Applied to:** The system surfaces this profile to the landlord: "You typically approve applicants scoring 75+ with affordability >2.5x. This applicant scores 82 but has affordability at 2.0x — below your typical threshold."

### 3. Explicit Learning: Feedback Loop

**What is learned:** Whether the landlord found an action's outcome helpful or not.

**How it works (existing — enhanced):**

```typescript
// Already implemented in lib/feedback-engine.ts
// Enhanced to track per-user sentiment:
function learnFromExplicitFeedback(
  actionId: string,
  outcome: "positive" | "negative" | "neutral",
) {
  const action = await ApplicantAction.findById(actionId);
  const stats = orgLearningModel.actionTypeStats[action.actionType];

  if (outcome === "positive") stats.positiveFeedbackCount++;
  if (outcome === "negative") stats.negativeFeedbackCount++;

  // Compute personalized confidence adjustment
  const feedbackRatio =
    stats.positiveFeedbackCount /
    Math.max(1, stats.positiveFeedbackCount + stats.negativeFeedbackCount);
  const confidenceAdjustment = (feedbackRatio - 0.5) * 2; // -1.0 to +1.0

  // Store adjustment for NBA confidence calculation
  return {
    actionType: action.actionType,
    confidenceAdjustment, // Applied as multiplier
    sampleSize: stats.positiveFeedbackCount + stats.negativeFeedbackCount,
  };
}
```

**Applied to:** NBA confidence scores get a per-user multiplier based on feedback ratio for that action type.

### 4. Implicit Learning: Tone Preference Detection

**What is learned:** Which communication tone the landlord prefers for each message type.

**How it works:**

```typescript
// Track tone selections across message generations
function learnTonePreference(
  userId: string,
  messageType: string,
  selectedTone: "professional" | "warm" | "direct",
) {
  const prefs = userPreferences[userId];
  const currentDefault = prefs.tonePreferences[messageType];

  // Rolling majority: if user picks same tone 3+ times in last 5
  // switch the default
  const recentTones = getRecentToneHistory(userId, messageType, 5);
  recentTones.push(selectedTone);

  const toneCounts = { professional: 0, warm: 0, direct: 0 };
  for (const t of recentTones) toneCounts[t]++;

  const mostFrequent = Object.entries(toneCounts).sort(
    (a, b) => b[1] - a[1],
  )[0][0] as "professional" | "warm" | "direct";

  if (mostFrequent !== currentDefault && toneCounts[mostFrequent] >= 3) {
    prefs.tonePreferences[messageType] = mostFrequent;
    // Log the adaptation
    await recordAuditLog({
      organizationId: orgId,
      actorUserId: userId,
      action: "personalization.tone_adapted",
      entityType: "user_preference",
      message: `Tone default for "${messageType}" changed from ${currentDefault} to ${mostFrequent} based on recent selections.`,
    });
  }
}
```

**Applied to:** The message composer auto-selects the learned default tone per message type. User can still override.

### 5. Implicit Learning: Workflow Habit Analysis

**What is learned:** When and how the landlord prefers to work.

```typescript
function analyzeWorkflowHabits(orgLearningModel: OrganizationLearningModel) {
  const actions = await ApplicantAction.find({
    organizationId,
    actedAt: { $gte: thirtyDaysAgo },
    status: { $in: ["accepted", "skipped", "overridden"] },
  }).lean();

  if (actions.length < 10) return; // Need minimum sample

  // Response time
  const responseTimes = actions
    .filter((a) => a.generatedAt && a.actedAt)
    .map((a) => (a.actedAt.getTime() - a.generatedAt.getTime()) / 3600000); // hours
  orgLearningModel.workflowHabits.averageResponseTimeHours =
    responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length;

  // Preferred work hours (find peak hours of activity)
  const hourCounts = new Array(24).fill(0);
  for (const a of actions) {
    hourCounts[a.actedAt.getHours()]++;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
  orgLearningModel.workflowHabits.preferredWorkHours = [
    Math.max(0, peakHour - 3), // Start of active window
    Math.min(23, peakHour + 3), // End of active window
  ];

  // Batch vs single action preference
  // If multiple actions acted within 5 minutes → batch
  const sortedByDate = [...actions].sort(
    (a, b) => a.actedAt.getTime() - b.actedAt.getTime(),
  );
  let batchCount = 0;
  for (let i = 1; i < sortedByDate.length; i++) {
    const gap =
      (sortedByDate[i].actedAt.getTime() -
        sortedByDate[i - 1].actedAt.getTime()) /
      60000;
    if (gap < 5) batchCount++;
  }
  orgLearningModel.workflowHabits.batchActionPreference = Math.round(
    (batchCount / actions.length) * 100,
  );
}
```

**Applied to:** Dashboard scheduling — show the operational inbox during peak work hours. Batch actions into grouped notifications vs individual alerts.

### 6. Tenant Pattern Recognition

**What is learned:** Whether a known applicant is re-applying and their past history.

```typescript
async function recognizeReturningTenant(
  applicant: ApplicantRecord,
): Promise<TenantMemoryEntry | null> {
  // Check by fingerprint first (deterministic)
  if (applicant.duplicateFingerprint) {
    return await TenantMemory.findOne({
      "knownIdentifiers.fingerprints": applicant.duplicateFingerprint,
    });
  }

  // Check by email (fuzzy)
  const byEmail = await TenantMemory.findOne({
    "knownIdentifiers.emails": applicant.email,
  });
  if (byEmail) return byEmail;

  // Check by phone + name similarity
  const byPhone = await TenantMemory.findOne({
    "knownIdentifiers.phones": applicant.phone,
  });
  if (byPhone) return byPhone;

  return null; // New tenant
}
```

**Applied to:** When a returning tenant is detected, the system surfaces their history in the applicant card:

```
🔄 Returning tenant — 2nd application
Previous: Approved for 123 Main St (Jul 2025 – Jun 2026)
Payment history: 11 on-time, 1 late
Lease: Renewed once, no violations
```

## Personalization Application

### NBA Confidence Calibration

```typescript
async function getPersonalizedConfidence(
  actionType: string,
  baseConfidence: number,
  organizationId: string,
  userId: string,
): Promise<{ confidence: number; adjustmentSource: string }> {
  const orgModel = await OrganizationLearningModel.findOne({ organizationId });
  const userPrefs = await UserPreferences.findOne({ userId });

  let adjustment = 0;
  let source = "base";

  // Factor 1: Action type history
  const stats = orgModel?.actionTypeStats[actionType];
  if (
    stats &&
    stats.acceptedCount + stats.skippedCount + stats.overriddenCount >= 5
  ) {
    const acceptRate =
      stats.acceptedCount /
      Math.max(
        1,
        stats.acceptedCount + stats.skippedCount + stats.overriddenCount,
      );
    if (acceptRate > 0.7) {
      adjustment += 5; // Boost: landlord usually accepts this
      source = "high_accept_rate";
    } else if (acceptRate < 0.3) {
      adjustment -= 10; // Penalty: landlord usually ignores this
      source = "low_accept_rate";
    }
  }

  // Factor 2: Feedback ratio
  if (stats && stats.positiveFeedbackCount + stats.negativeFeedbackCount >= 3) {
    const feedbackRatio =
      stats.positiveFeedbackCount /
      Math.max(1, stats.positiveFeedbackCount + stats.negativeFeedbackCount);
    adjustment += (feedbackRatio - 0.5) * 10; // -5 to +5
    source = source === "base" ? "feedback" : `${source}+feedback`;
  }

  // Factor 3: User confidence floor
  const minShow = userPrefs?.minConfidenceToShow ?? 0;
  if (baseConfidence + adjustment < minShow) {
    adjustment = minShow - baseConfidence + 1; // Ensure it shows if above floor
  }

  return {
    confidence: Math.max(0, Math.min(100, baseConfidence + adjustment)),
    adjustmentSource: source,
  };
}
```

### Communication Tone Auto-Selection

```typescript
async function getPersonalizedTone(
  userId: string,
  messageType: string,
  requestedTone?: "professional" | "warm" | "direct",
): Promise<{ tone: string; autoSelected: boolean }> {
  // Explicit request always wins
  if (requestedTone) {
    return { tone: requestedTone, autoSelected: false };
  }

  const prefs = await UserPreferences.findOne({ userId });
  const learnedTone = prefs?.tonePreferences[messageType];

  if (learnedTone) {
    return { tone: learnedTone, autoSelected: true };
  }

  // Default by message type
  const defaults: Record<string, string> = {
    follow_up: "warm",
    document_request: "professional",
    decision: "professional",
    renewal: "warm",
    payment: "direct",
  };

  return { tone: defaults[messageType] ?? "professional", autoSelected: false };
}
```

### Risk Threshold Personalization

```typescript
function getPersonalizedRiskThreshold(orgModel: OrganizationLearningModel): {
  effectiveMinAffordability: number;
  effectiveMinResidentScore: number;
  effectiveStrongThreshold: number;
} {
  const profile = orgModel.approvalProfile;

  // Need minimum 20 decisions for reliable personalization
  if (profile.totalDecisions < 20) {
    // Return defaults
    return {
      effectiveMinAffordability: 2.5,
      effectiveMinResidentScore: 560,
      effectiveStrongThreshold: 80,
    };
  }

  // Use observed boundaries
  return {
    effectiveMinAffordability: profile.minAffordabilityObserved ?? 2.5,
    effectiveMinResidentScore: profile.maxRiskTolerance ?? 560,
    effectiveStrongThreshold: profile.avgScoreThreshold ?? 80,
  };
}
```

### Dashboard Personalization

```typescript
async function getPersonalizedDashboard(userId: string): Promise<{
  defaultSection: string;
  defaultFilter: string;
  defaultSort: string;
  autoExpandNBA: boolean;
}> {
  const prefs = await UserPreferences.findOne({ userId });
  if (!prefs) {
    return {
      defaultSection: "overview",
      defaultFilter: "All",
      defaultSort: "newest",
      autoExpandNBA: false,
    };
  }

  return {
    defaultSection: prefs.defaultSection,
    defaultFilter: prefs.defaultDecisionFilter,
    defaultSort: prefs.defaultSortBy,
    autoExpandNBA: prefs.autoExpandActions,
  };
}
```

## Personalization API Routes

### GET /api/personalization/preferences

Returns the current user's `UserPreferences` document.

### PATCH /api/personalization/preferences

Updates specific preference fields.

**Request:**

```json
{
  "tonePreferences": { "follow_up": "warm" },
  "defaultSection": "all",
  "autoExpandActions": true
}
```

### GET /api/personalization/profile

Returns the organization's learning model (read-only for users, writable by admins).

### GET /api/personalization/insights

Returns AI-generated behavioral insights about the landlord's patterns.

**Response:**

```json
{
  "insights": [
    {
      "type": "approval_pattern",
      "title": "You tend to approve applicants scoring 75+",
      "description": "88% of your approvals are for applicants scoring 75 or higher. This applicant scores 72.",
      "confidence": 85
    },
    {
      "type": "tone_pattern",
      "title": "You prefer Warm tone for follow-ups",
      "description": "You've selected Warm for 8 of your last 10 follow-up messages.",
      "confidence": 90
    },
    {
      "type": "action_pattern",
      "title": "You frequently skip 'verify_income_docs' actions",
      "description": "You've skipped 6 of the last 8 income verification recommendations.",
      "confidence": 75
    }
  ]
}
```

### POST /api/personalization/forget

Reset personalization data (GDPR/compliance).

## Tenant Memory API Routes

### GET /api/tenants/:identifier

Look up a tenant by email, phone, or fingerprint.

**Response:**

```json
{
  "found": true,
  "tenantId": "tnt_abc123",
  "pastApplications": 2,
  "pastDecisions": ["Approved", "Approved"],
  "leaseHistory": {
    "current": {
      "property": "123 Main St",
      "status": "active",
      "onTimePayments": 14,
      "latePayments": 0
    }
  },
  "tenantRiskScore": 15
}
```

### GET /api/tenants?property=:propertyId

List all tenants (past and present) for a property.

## Existing Code That Already Supports Memory & Personalization

| Existing File                                  | Contribution                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `lib/feedback-engine.ts`                       | `computeHistoricalAccuracy()` — per-action-type accuracy from feedback                            |
| `lib/action-engine.ts`                         | `computeConfidence()` — blends historical accuracy into confidence scores                         |
| `models/ApplicantAction.ts`                    | `status`, `outcome`, `overrideReason`, `actedByUserId`, `actedAt` — raw learning signals          |
| `lib/audit-log.ts`                             | `recordAuditLog()` — every user action is logged with metadata                                    |
| `components/dashboard/applicant-dashboard.tsx` | `decisionFilter`, `propertyFilter`, `sortBy` state — current filter preferences                   |
| `models/Organization.ts`                       | `automationSettings`, `screeningPolicy` — org-level configuration that personalization can adjust |
| `models/Applicant.ts`                          | `duplicateFingerprint` — foundation for tenant identity tracking                                  |
| `lib/scoring.ts`                               | Red flag detection — can be personalized per-org based on observed tolerance                      |

## Existing Gaps & Implementation Path

| Gap                          | Current State                                                | Implementation Required                                                                |
| ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| User-specific preferences    | None — all users get same defaults                           | Create `UserPreferences` model + CRUD API                                              |
| Organization learning model  | Only action-type stats in feedback-engine                    | Create `OrganizationLearningModel` with approval profile, risk tolerance, action stats |
| Tenant memory                | Duplicate fingerprint exists but no persistent tenant record | Create `TenantMemory` model with application + lease history                           |
| Tone learning                | No tone tracking                                             | Add tone history to `UserPreferences`, implement `learnTonePreference()`               |
| Workflow habit analysis      | No analysis                                                  | Implement `analyzeWorkflowHabits()` from action timestamps                             |
| Personalized NBA confidence  | Base confidence only                                         | Add `getPersonalizedConfidence()` blending history + feedback + user prefs             |
| Personalized risk thresholds | Static policy values only                                    | Add `getPersonalizedRiskThreshold()` from observed approval boundaries                 |
| Pattern explanation          | No insights                                                  | Add AI prompt for behavioral insight generation                                        |

## Fulfillment Table

| Requirement              | How It's Met                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Landlord preferences** | `UserPreferences` model persists tone, filter, sort, default section, NBA display settings. Learn tone preference from message type selection history (rolling majority over 5 recent). Dashboard defaults from stored preferences.                                |
| **Approval behavior**    | `OrganizationLearningModel.approvalProfile` tracks total decisions, approve/reject rates, observed score thresholds, min affordability accepted, max risk tolerated. Per-action-type stats track accept/skip/override rates and avg confidence at each resolution. |
| **Tenant patterns**      | `TenantMemory` model stores stable identity fingerprint across applications. Tracks application history (decisions, scores, red flags), lease history (payment timeliness, violations, renewals), and communication history. Computes tenant risk score.           |
| **Workflow habits**      | `OrganizationLearningModel.workflowHabits` tracks average response time, preferred work hours (from peak action timestamps), batch vs single action preference, and action resolution rate. Used to schedule the operational inbox during peak hours.              |
