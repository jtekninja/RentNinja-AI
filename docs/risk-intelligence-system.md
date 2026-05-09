# Risk Intelligence System — Design Document

## Overview

The Risk Intelligence System evaluates applicants and tenants across multiple risk dimensions using deterministic rules first and AI augmentation second. It scores fraud indicators, payment risk, lease compliance risk, documentation inconsistency, and behavioral signals into a unified risk profile — without over-relying on black-box AI. Every risk signal is explainable, confidence-weighted, and surfaced via the existing NBA engine and operational inbox.

## Design Principles

1. **Deterministic first, AI second** — Hard rules (score thresholds, missing fields, duplicate fingerprints, affordability ratios) fire first. AI is only invoked for ambiguous signals where rule-based detection is insufficient.
2. **Explainability by default** — Every risk signal includes what was detected, what data was used, what threshold was crossed, and the confidence level. No black boxes.
3. **Multi-dimension scoring** — Risk is not a single number. Each dimension (fraud, payment, lease, documentation, behavioral) is scored independently and surfaced separately.
4. **Confidence-weighted** — Signals with high confidence (e.g., confirmed duplicate fingerprint = 100%) carry more weight than ambiguous signals (e.g., "income seems high for stated job" = 40%).
5. **Temporal awareness** — Risk scores decay over time. A red flag from 6 months ago is less relevant than one from yesterday.
6. **Feedback loop** — When a landlord accepts/skip/overrides a risk-based action, that feedback calibrates future risk scoring.

## Current Risk Infrastructure

The codebase already has significant risk detection built into the scoring engine and action rules:

### Scoring Engine (`lib/scoring.ts`) — Deterministic Rules

```typescript
// 10 red flag detectors already implemented:
1.  affordabilityRatio < minAffordabilityRatio (default 2.5x)
2.  residentScore < minResidentScore (default 560)
3.  rentalHistoryScore < 60
4.  rulesComplianceScore < 60
5.  timelineScore < 60
6.  communicationScore < 60
7.  documentationScore < 60
8.  income docs below policy threshold (70)
9.  government ID not confirmed
10. landlord reference weak
11. tenant-paid rent share not confirmed
12. subsidy verification pending
13. program inspection failed
```

### Action Engine (`lib/action-engine.ts`) — Rule-Based Risk Actions

```typescript
// 3 risk-specific rules:
1. "failed_inspection_stuck"  → P0 Urgent
2. "expedite_risk_review"     → P0 Urgent (risk + approaching move-in)
3. "review_duplicate"         → P2 (possible duplicate application)
```

### Operational Inbox (`lib/ai-operations.ts`) — Risk Detectors

```typescript
// 3 risk detectors:
1. detectUrgentIssues()     → P0 failed inspection, risk move-in, unverified subsidy
2. detectBottlenecks()       → screening backlog, inspection queue, high review ratio
3. detectRepetitiveWork()    → manual entry patterns, missing co-applicant contact
```

### Applicant Model (`models/Applicant.ts`) — Risk-Relevant Fields

```typescript
duplicateFingerprint: string;   // Deterministic: hash of name+email+phone+DOB
duplicateDayKey: string;        // Deterministic: hash for same-day duplicates
redFlags: string[];             // Populated by calculateApplicantScore()
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Risk Intelligence System                         │
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────┐  │
│  │  Deterministic  │  │  Cross-Applic. │  │  AI-Assisted Signals   │  │
│  │  Risk Detectors │→ │  Analysis      │→ │  (Confidence < 70%)   │  │
│  │  (Conf ≥ 70%)   │  │  (Fraud /      │  │                        │  │
│  │                  │  │   Duplicate)   │  │ • income-inconsistent  │  │
│  │ • scoring red-   │  │                │  │ • employment gaps      │  │
│  │   flags (13)     │  │ • fingerprint  │  │ • reference evasion    │  │
│  │ • affordability  │  │   match        │  │ • behavioral patterns  │  │
│  │ • resident score │  │ • email domain │  │ • document anomaly     │  │
│  │ • inspection     │  │ • IP overlap   │  │                        │  │
│  │ • subsidy status │  │ • phone reuse  │  │                        │  │
│  └────────┬─────────┘  └───────┬────────┘  └───────────┬─────────────┘  │
│           │                    │                        │                │
│           ▼                    ▼                        ▼                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Risk Aggregation Layer                              │  │
│  │  ┌────────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │  │
│  │  │ RiskScore  │  │ Confidence│  │ Explain-  │  │ Timeline    │ │  │
│  │  │ per dim.   │→ │ Weighting │→ │ ability   │→ │ Decay       │ │  │
│  │  └────────────┘  └───────────┘  └───────────┘  └─────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Integration with Existing Systems                                      │
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────────┐  │
│  │ NBA Engine     │→ │ Operational    │→ │ Risk Intelligence View  │  │
│  │ (action-engine)│  │ Inbox          │  │ (per-applicant detail)  │  │
│  │                │  │ (ai-operations)│  │                         │  │
│  │ Adds risk-     │  │ Surfaces risk  │  │ Heatmap of fraud/       │  │
│  │ based actions  │  │ items in feed  │  │ payment/lease/doc risk  │  │
│  └────────────────┘  └────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Risk Dimensions

### 1. Fraud Indicators

| Rule ID                       | Rule                                                 | Deterministic?  | Confidence | Data Sources                                            | Logic                                                                                                                 |
| ----------------------------- | ---------------------------------------------------- | --------------- | ---------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `fraud-duplicate-fingerprint` | Same applicant appears multiple times                | ✅ Yes          | 100%       | `duplicateFingerprint` field                            | Hash collision on name+email+phone → identical fingerprint                                                            |
| `fraud-duplicate-day`         | Same applicant same day                              | ✅ Yes          | 95%        | `duplicateDayKey` field                                 | Hash collision on name+date → identical daily key                                                                     |
| `fraud-email-domain`          | Disposable or suspicious email domain                | ✅ Yes          | 85%        | `email` field, blocklist                                | Check email domain against known disposable email providers (mailinator, tempmail, guerrillamail, 10minutemail, etc.) |
| `fraud-phone-invalid`         | Phone number format suspicious                       | ✅ Yes          | 80%        | `phone` field                                           | Check length, repeated digits (111-111-1111), known invalid prefixes                                                  |
| `fraud-name-anomaly`          | Name contains only initials, gibberish, or non-names | ✅ Yes          | 75%        | `name` field                                            | Check for single character names, repeated characters, all uppercase, all lowercase with no spaces                    |
| `fraud-income-mismatch`       | Income inconsistent with employment/property         | ⚠️ AI suggested | 60%        | `monthlyIncome`, `propertyAddress`, `applicationSource` | If income is exactly 3x rent (standard policy minimum), very high income with low documentation score                 |
| `fraud-multi-app-same-ip`     | Multiple applicants from same IP (future)            | ✅ Yes          | 90%        | Request metadata                                        | Track IP per applicant creation, flag when >3 from same IP                                                            |
| `fraud-fake-coapplicant`      | Co-applicant has same contact info as primary        | ✅ Yes          | 95%        | `coApplicants[].email/phone` vs `email/phone`           | Check if any co-applicant email or phone matches the primary applicant                                                |

### 2. Payment Risk

| Rule ID                       | Rule                                       | Deterministic?  | Confidence | Data Sources                                                  | Logic                                                                                 |
| ----------------------------- | ------------------------------------------ | --------------- | ---------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `payment-affordability`       | Income-to-rent ratio below threshold       | ✅ Yes          | 95%        | `monthlyIncome`, `monthlyRent`, `housingSupport`              | `affordabilityRatio < policy.minAffordabilityRatio`                                   |
| `payment-subsidy-unverified`  | Housing subsidy not verified               | ✅ Yes          | 85%        | `subsidyStatus`, `housingSupport`, `createdAt`                | Subsidy pending >30 days                                                              |
| `payment-income-unstable`     | Income source is manual/unspecified        | ⚠️ AI suggested | 60%        | `applicationSource`, `scores.income`, `notes`                 | Manual entry with no supporting docs, income score significantly below resident score |
| `payment-rent-share-unclear`  | Tenant portion not calculable              | ✅ Yes          | 90%        | `tenantPortionRent`, `monthlySubsidyAmount`, `housingSupport` | Housing support active but rent share is 0                                            |
| `payment-income-docs-missing` | Required income docs not provided          | ✅ Yes          | 85%        | `scores.documentation`, `monthlyIncome`                       | Documentation score <70 with high income (>3x rent)                                   |
| `payment-past-due-tenant`     | Existing tenant has late payments (future) | ✅ Yes          | 100%       | External payment records                                      | Track payment timeliness for lease-renewing tenants                                   |

### 3. Lease Risk

| Rule ID                      | Rule                                              | Deterministic? | Confidence | Data Sources                         | Logic                                                      |
| ---------------------------- | ------------------------------------------------- | -------------- | ---------- | ------------------------------------ | ---------------------------------------------------------- |
| `lease-inspection-failed`    | Required inspection failed                        | ✅ Yes         | 100%       | `inspectionStatus`                   | inspectionStatus === "Failed"                              |
| `lease-inspection-pending`   | Inspection still pending for subsidized applicant | ✅ Yes         | 85%        | `inspectionStatus`, `housingSupport` | inspectionStatus === "Pending" with housing support        |
| `lease-rental-history-weak`  | Rental history score below threshold              | ✅ Yes         | 85%        | `scores.rentalHistory`, `redFlags`   | rentalHistory < 60                                         |
| `lease-rules-compliance`     | Rules compliance score low                        | ✅ Yes         | 80%        | `scores.rulesCompliance`, `redFlags` | rulesCompliance < 60                                       |
| `lease-timeline-unreliable`  | Timeline/reliability score low                    | ✅ Yes         | 75%        | `scores.timeline`, `redFlags`        | timeline < 60                                              |
| `lease-communication-weak`   | Communication score low                           | ✅ Yes         | 70%        | `scores.communication`, `redFlags`   | communication < 60                                         |
| `lease-landlord-ref-missing` | Landlord reference required but not strong        | ✅ Yes         | 80%        | `scores.rentalHistory`, `policy`     | rentalHistory < 70 when `requireLandlordReference` is true |
| `lease-gov-id-missing`       | Government ID required but not verified           | ✅ Yes         | 85%        | `scores.documentation`, `policy`     | documentation < 70 when `requireGovernmentId` is true      |

### 4. Inconsistent Documentation

| Rule ID                  | Rule                                                     | Deterministic?  | Confidence | Data Sources                                     | Logic                                                                               |
| ------------------------ | -------------------------------------------------------- | --------------- | ---------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `doc-income-vs-rent`     | Income is suspiciously round number                      | ✅ Yes          | 65%        | `monthlyIncome`, `monthlyRent`                   | Income is an exact multiple of rent (e.g., 3x exactly) with no documentation        |
| `doc-score-gap`          | Large gap between sub-scores                             | ✅ Yes          | 75%        | `scores`                                         | Gap between highest and lowest sub-score > 50 points                                |
| `doc-resident-vs-income` | Resident score much lower than income score              | ⚠️ AI suggested | 60%        | `scores.resident`, `scores.income`               | Resident score < 40 with income score > 90 — suggests inflated income               |
| `doc-coapplicant-gap`    | Co-applicant resident score much lower than primary      | ✅ Yes          | 80%        | `residentScore`, `coApplicants[].residentScore`  | Gap between primary and any co-applicant resident score > 40 points                 |
| `doc-rental-vs-rules`    | Good rental history but poor rules compliance            | ⚠️ AI suggested | 55%        | `scores.rentalHistory`, `scores.rulesCompliance` | rentalHistory > 80 but rulesCompliance < 30 — suggests inconsistent tenant behavior |
| `doc-no-source`          | Application source is manual with no supporting evidence | ✅ Yes          | 80%        | `applicationSource`                              | Source is "Email / Manual" and documentation score < 50                             |
| `doc-missing-fields`     | Critical fields missing or zero                          | ✅ Yes          | 90%        | Multiple required fields                         | `isUnsetNumber(monthlyIncome)`, `isUnsetNumber(monthlyRent)`, empty email/phone     |

### 5. Behavioral Signals (Future)

| Rule ID                        | Rule                                           | Deterministic?  | Confidence | Logic                                                                   |
| ------------------------------ | ---------------------------------------------- | --------------- | ---------- | ----------------------------------------------------------------------- |
| `behavior-response-time`       | Applicant response time to requests            | ⚠️ AI suggested | 60%        | Track time between document requests and uploads                        |
| `behavior-application-changes` | Applicant made multiple changes to application | ⚠️ AI suggested | 55%        | Track edits to key fields (income, employment)                          |
| `behavior-inquiry-pattern`     | Unusual inquiry pattern across properties      | ✅ Yes          | 70%        | Track same applicant across multiple properties                         |
| `behavior-note-sentiment`      | Notes from prior landlord indicate issues      | ✅ Yes          | 85%        | Keyword matching on applicant notes (eviction, late, damage, complaint) |

## Risk Scoring Model

### Per-Dimension Score

Each dimension is scored 0–100 independently:

```typescript
interface DimensionRisk {
  dimension: "fraud" | "payment" | "lease" | "documentation" | "behavioral";
  score: number; // 0 (no risk) – 100 (highest risk)
  confidence: number; // 0–100 — how certain we are of this score
  signals: RiskSignal[]; // Individual signals that contributed
}
```

### Signal Model

```typescript
interface RiskSignal {
  signalId: string; // e.g. "fraud-duplicate-fingerprint"
  dimension: RiskDimension;
  rule: string; // Deterministic rule or AI suggestion
  source: "deterministic" | "ai";
  detected: boolean;
  confidence: number; // How certain the signal is (0–100)
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string; // Human-readable explanation
  facts: Record<string, unknown>; // Data that triggered the signal
  threshold?: unknown; // Policy threshold applied
  timestamp: string;
  expiresAt?: string; // Optional: when this signal decays
}
```

### Scoring Formula

```
dimensionScore = weightedAverage of signalScores
  where each signalScore = (severityWeight × confidence) / maxPossible

severityWeights:
  critical: 1.0
  high:     0.75
  medium:   0.5
  low:      0.25
  info:     0.1

If no signals fire: dimensionScore = 0
If any critical signal: dimensionScore = min(100, criticalFactor * 100)
```

### Composite Risk Score

```typescript
interface CompositeRiskProfile {
  overall: number; // 0–100 weighted across dimensions
  dimensions: DimensionRisk[]; // Per-dimension breakdown
  criticalSignals: RiskSignal[]; // Any critical-level signals
  summary: string; // AI-generated or rule-based summary
  generatedAt: string;
  expiresAt: string; // Risk profile expires (data staleness)
}
```

**Weight distribution for overall score:**

- Fraud: 35% — Highest weight because undetected fraud causes the most damage
- Payment: 25% — Second priority for landlord revenue
- Lease: 20% — Property protection and compliance
- Documentation: 15% — Indicator quality control
- Behavioral: 5% — Future, low weight

**Tier mapping:**
| Overall Score | Tier | Color | Action |
|---|---|---|---|
| 0–20 | Low | Green | Standard processing |
| 21–40 | Moderate | Yellow | Review flagged signals |
| 41–60 | Elevated | Orange | Manual review required |
| 61–80 | High | Red | Escalate, may require additional documentation |
| 81–100 | Critical | Dark Red | Recommend rejection or legal review |

## Deterministic Rules Implementation (Current + Proposed)

### Already Implemented (in `lib/scoring.ts`)

The 13 red flag detectors in `calculateApplicantScore()` already form the core of payment and lease risk. They fire during application scoring and store results in `applicant.redFlags[]`.

### Proposed New Rules

```typescript
// lib/risk-intelligence.ts — New file

export function detectFraudSignals(applicant: ApplicantRecord): RiskSignal[] {
  const signals: RiskSignal[] = [];

  // 1. Duplicate fingerprint
  if (applicant.duplicateFingerprint) {
    signals.push({
      signalId: "fraud-duplicate-fingerprint",
      dimension: "fraud",
      rule: "Duplicate applicant fingerprint detected",
      source: "deterministic",
      detected: true,
      confidence: 100,
      severity: "critical",
      description: `Applicant shares identity fingerprint with another record (${applicant.duplicateFingerprint.slice(0, 8)}...).`,
      facts: { duplicateFingerprint: applicant.duplicateFingerprint },
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Disposable email domain
  if (isDisposableEmail(applicant.email)) {
    signals.push({
      signalId: "fraud-email-domain",
      dimension: "fraud",
      rule: "Disposable email domain detected",
      source: "deterministic",
      detected: true,
      confidence: 85,
      severity: "high",
      description: `Email uses disposable domain: ${extractDomain(applicant.email)}.`,
      facts: { email: applicant.email, domain: extractDomain(applicant.email) },
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Phone number anomalies
  if (hasSuspiciousPhone(applicant.phone)) {
    signals.push({
      signalId: "fraud-phone-invalid",
      dimension: "fraud",
      rule: "Suspicious phone number format",
      source: "deterministic",
      detected: true,
      confidence: 80,
      severity: "high",
      description:
        "Phone number has suspicious pattern (repeated digits, invalid length).",
      facts: { phone: applicant.phone },
      timestamp: new Date().toISOString(),
    });
  }

  // 4. Co-applicant contact overlap
  for (const co of applicant.coApplicants) {
    if (co.email && co.email === applicant.email) {
      signals.push({
        signalId: "fraud-fake-coapplicant",
        dimension: "fraud",
        rule: "Co-applicant shares email with primary",
        source: "deterministic",
        detected: true,
        confidence: 95,
        severity: "critical",
        description: `Co-applicant "${co.name}" uses the same email as primary applicant.`,
        facts: { coApplicantEmail: co.email, primaryEmail: applicant.email },
        timestamp: new Date().toISOString(),
      });
    }
    if (co.phone && co.phone === applicant.phone) {
      signals.push({
        signalId: "fraud-fake-coapplicant",
        dimension: "fraud",
        rule: "Co-applicant shares phone with primary",
        source: "deterministic",
        detected: true,
        confidence: 95,
        severity: "critical",
        description: `Co-applicant "${co.name}" uses the same phone number as primary applicant.`,
        facts: { coApplicantPhone: co.phone, primaryPhone: applicant.phone },
        timestamp: new Date().toISOString(),
      });
    }
  }

  return signals;
}
```

```typescript
export function detectDocumentationInconsistencies(
  applicant: ApplicantRecord,
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  // 1. Large sub-score gap
  const scoreValues = Object.values(applicant.scores).filter((v) => v > 0);
  if (scoreValues.length >= 2) {
    const max = Math.max(...scoreValues);
    const min = Math.min(...scoreValues);
    if (max - min > 50) {
      signals.push({
        signalId: "doc-score-gap",
        dimension: "documentation",
        rule: "Large gap between score sub-components",
        source: "deterministic",
        detected: true,
        confidence: 75,
        severity: "medium",
        description: `Score range is ${max - min} points (${min}–${max}). Gap >50 suggests inconsistency.`,
        facts: {
          maxScore: max,
          minScore: min,
          gap: max - min,
          scores: applicant.scores,
        },
        threshold: { maxGap: 50 },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 2. Manual source with low documentation
  if (
    applicant.applicationSource === "Email / Manual" &&
    applicant.scores.documentation < 50
  ) {
    signals.push({
      signalId: "doc-no-source",
      dimension: "documentation",
      rule: "Manual application with low documentation score",
      source: "deterministic",
      detected: true,
      confidence: 80,
      severity: "medium",
      description: `Source is ${applicant.applicationSource} with documentation score ${applicant.scores.documentation}. No automated data ingestion.`,
      facts: {
        applicationSource: applicant.applicationSource,
        documentationScore: applicant.scores.documentation,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Income suspiciously round (3x exactly, common fabrication)
  if (applicant.monthlyRent > 0 && applicant.scores.documentation < 70) {
    const ratio = applicant.monthlyIncome / applicant.monthlyRent;
    if (Math.abs(ratio - 3.0) < 0.01 || Math.abs(ratio - 2.5) < 0.01) {
      signals.push({
        signalId: "doc-income-vs-rent",
        dimension: "documentation",
        rule: "Income is exact multiple of rent with weak documentation",
        source: "deterministic",
        detected: true,
        confidence: 65,
        severity: "low",
        description: `Income ($${applicant.monthlyIncome}) is exactly ${ratio.toFixed(1)}x rent with documentation score ${applicant.scores.documentation}.`,
        facts: {
          monthlyIncome: applicant.monthlyIncome,
          monthlyRent: applicant.monthlyRent,
          exactRatio: ratio,
          documentationScore: applicant.scores.documentation,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  return signals;
}
```

## AI-Assisted Signals (Second Layer)

When deterministic rules detect ambiguous patterns, an AI prompt can be invoked for deeper analysis. Unlike the deterministic layer, AI signals carry lower confidence and are clearly labeled.

### When to invoke AI

```
1. All deterministic rules evaluated
2. If any of these conditions met:
   a) documentation_score ≥ 30 && ≤ 60 (ambiguous docs)
   b) multiple low-to-medium severity signals fire (stacks)
   c) manual source with no dupe fingerprint but suspicious pattern
3. POST /api/risk/ai-analysis/:applicantId
4. AI returns structured risk observations with confidence < 70%
```

### AI Prompt Structure

```typescript
const RISK_AI_PROMPT = `
You are a risk assessment assistant for a property management system.
Review the applicant data below and identify any potential risks that
are not already obvious from the deterministic rules.

Focus on:
1. Income inconsistencies (stated income vs. property value/type)
2. Employment documentation gaps
3. Co-applicant relationship plausibility
4. Reference quality indicators
5. Application completeness patterns

Return observations with LOW confidence (40-65%). If you can't find
anything noteworthy, return an empty array.

Rules:
- Do not invent facts not provided
- Do not use demographic information (age, gender, ethnicity)
- State what specific data triggered each observation
- Confidence must be below 70% — we are looking for subtle signals
`;
```

### AI Signal Output

```typescript
interface AiRiskObservation {
  signalId: string;
  description: string;
  confidence: number; // Always < 70
  facts: Record<string, unknown>;
  severity: "medium" | "low" | "info";
}
```

## Explainability

Every risk signal includes the same explainability model used by the NBA engine and FactTrail:

```typescript
interface RiskExplainability {
  rule: string; // Human-readable rule name
  signalId: string; // Machine-readable ID
  facts: Record<string, unknown>; // Data that triggered the signal
  threshold?: unknown; // Policy threshold applied
  source: "deterministic" | "ai"; // How the signal was generated
  confidence: number; // Signal confidence (0–100)
}
```

**Example rendering:**

```
┌──────────────────────────────────────────────────────┐
│ ⚠ Risk: Fraud Indicators (score: 72/100)             │
│                                                      │
│ 🔴 CRITICAL (100% confident)                         │
│   Duplicate applicant fingerprint detected           │
│   → Same identity fingerprint as application #ABC456 │
│   → Data: fingerprint "a1b2c3d4..."                  │
│                                                      │
│ 🟡 HIGH (85% confident)                              │
│   Disposable email domain detected                   │
│   → "jane@mailinator.com" uses disposable email      │
│   → Data: domain "mailinator.com"                    │
│                                                      │
│ 🟢 No other fraud signals detected                   │
└──────────────────────────────────────────────────────┘
```

## UI Integration

### Per-Applicant Risk View

The risk profile is rendered as a collapsible section within each applicant card in `applicant-list.tsx`:

```
┌──────────────────────────────────────────────────────────┐
│  ⚠ Risk Intelligence                    [Show details ▾] │
│                                                          │
│  Fraud: ██████████░░░░ 72/100    High                    │
│  Payment: ██░░░░░░░░░░ 18/100    Low                     │
│  Lease: ██████░░░░░░░░ 35/100    Moderate                │
│  Documentation: ████░░░░░░░░ 22/100  Low                 │
│                                                          │
│  Overall Risk Tier: Elevated (55/100)                    │
│                                                          │
│  [View full report]                                      │
└──────────────────────────────────────────────────────────┘
```

### Operational Inbox Integration

Risk items appear in the Priority Feed with the same P0–info priority system:

| Risk Signal              | Priority      | Feed Section |
| ------------------------ | ------------- | ------------ |
| Duplicate fingerprint    | P0 (critical) | Urgent       |
| Disposable email         | P1 (high)     | Action       |
| Large score gap          | P2 (normal)   | Action       |
| Manual app with low docs | info          | Tip          |

## Disposable Email Domain Blocklist

```typescript
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "temp-mail.org",
  "mailcatch.com",
  "mailexpire.com",
  "mailsac.com",
  "spamgourmet.com",
  "jetable.org",
  "inboxbear.com",
  "mailnator.com",
  "tempinbox.com",
  "dispostable.com",
  "maildrop.cc",
  "getnada.com",
  "emailondeck.com",
  "burnermail.io",
  "inboxkitten.com",
  "mohmal.com",
]);

function isDisposableEmail(email: string): boolean {
  const domain = extractDomain(email);
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}
```

## Suspicious Phone Detection

```typescript
function hasSuspiciousPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");

  // Must be 7 or 10 digits (US)
  if (digits.length !== 7 && digits.length !== 10) return false;

  // Repeated single digit (111-111-1111)
  if (/^(\d)\1{9}$/.test(digits)) return true;

  // Sequential digits (123-456-7890)
  if (/^1234567890$/.test(digits)) return true;

  // Ascending/descending patterns
  let ascending = true;
  let descending = true;
  for (let i = 1; i < digits.length; i++) {
    if (parseInt(digits[i]) !== parseInt(digits[i - 1]) + 1) ascending = false;
    if (parseInt(digits[i]) !== parseInt(digits[i - 1]) - 1) descending = false;
  }
  if (ascending || descending) return true;

  return false;
}
```

## Risk Profile Expiry

- **Per-signal expiry**: Each signal has an `expiresAt` based on its type
  - Duplicate fingerprint: Never expires (identity match is permanent)
  - Income/score-based signals: 90 days (re-evaluated on data change)
  - Behavioral signals: 30 days (decay quickly)
  - AI observations: 14 days (always re-evaluated)
- **Full profile recalculation**: Triggered on any applicant data change or NBA generation request

## Integration with Action Engine

The risk intelligence system feeds into the NBA engine as additional action rules:

```typescript
// Proposed new NBA rules:
rule({
  id: "fraud_duplicate_detected",
  condition: (a) => Boolean(a.duplicateFingerprint),
  priorityBase: "P0",
  confidenceBase: 100,
  requiredFields: ["duplicateFingerprint", "name", "email"],
  generate: (a) => ({
    actionType: "investigate_duplicate",
    title: `Possible duplicate: ${a.name}`,
    description: `Identity fingerprint matches another application (${a.email}).`,
    suggestedAction: "Review duplicate applications and merge or reject.",
    priority: "P0",
    explainability: [{
      rule: "fraud_duplicate_detected",
      facts: { fingerprint: a.duplicateFingerprint, email: a.email }
    }],
    automationSafe: false,
  }),
}),
```

## Key Files (Proposed)

| File                                              | Purpose                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| `lib/risk-intelligence.ts`                        | Core risk engine: fraud/phone/email/domain detectors, scoring, aggregation |
| `lib/risk-constants.ts`                           | Domain blocklists, severity weights, dimension configs                     |
| `models/RiskProfile.ts`                           | Mongoose schema for cached risk profiles                                   |
| `app/api/risk/[applicantId]/route.ts`             | GET — fetch risk profile for an applicant                                  |
| `app/api/risk/ai-analysis/[applicantId]/route.ts` | POST — invoke AI for second-layer signals                                  |
| `components/dashboard/risk-profile.tsx`           | UI component for risk heatmap per applicant                                |
| `components/dashboard/risk-signal-row.tsx`        | Individual signal display with explainability                              |

## Existing Code That Already Supports Risk

| Existing File                             | Risk Contribution                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `lib/scoring.ts`                          | 13 deterministic red flag detectors, affordability/decision calculations |
| `lib/action-engine.ts`                    | Duplicate detection rule, risk-based P0 actions                          |
| `lib/ai-operations.ts`                    | Urgent issue detector, bottleneck detector                               |
| `models/Applicant.ts`                     | `duplicateFingerprint`, `duplicateDayKey`, `redFlags` fields             |
| `components/dashboard/applicant-list.tsx` | Red flag display, score breakdown, AI review section                     |
| `components/dashboard/priority-feed.tsx`  | Risk item display with explainability                                    |
| `lib/feedback-engine.ts`                  | Historical accuracy can be extended to risk signal feedback              |

## Fulfillment Table

| Requirement                    | How It's Met                                                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fraud indicators**           | 8 deterministic rules: duplicate fingerprint, duplicate day, disposable email, suspicious phone, name anomaly, multi-app IP, fake co-applicant, income mismatch (AI-assisted) |
| **Payment risk**               | 6 deterministic rules: affordability ratio, unverified subsidy, unstable income, unclear rent share, missing income docs, past-due tenant (future)                            |
| **Lease risk**                 | 8 deterministic rules: inspection failed/pending, weak rental history, poor rules compliance, unreliable timeline, weak communication, missing landlord ref, missing gov ID   |
| **Inconsistent documentation** | 7 rules: score gap, resident-vs-income gap (AI), co-applicant gap, rental-vs-rules gap (AI), manual source with low docs, missing fields, income-vs-rent exact multiple       |
| **Confidence scoring**         | Per-signal confidence (55–100%) based on rule determinism, data quality, and source type. Composite score = weighted average with severity multipliers                        |
| **Explainability**             | Every signal includes `{ rule, signalId, facts, threshold, source, confidence }` — rendered in RiskProfile UI component matching the FactTrail pattern                        |
