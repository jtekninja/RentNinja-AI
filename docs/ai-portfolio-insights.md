# AI-Powered Portfolio Insights — Design Document

## Overview

The Portfolio Insights system transforms raw applicant pipeline data into actionable intelligence for property managers. It combines deterministic aggregations (summary stats, trends, ratios) with AI-powered analysis (narrative summaries, anomaly detection, predictions) to give landlords a real-time understanding of their portfolio's health — without requiring them to manually crunch numbers or spot patterns.

## Capabilities

| Capability                  | Description                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Operational summaries**   | Concise narrative of current pipeline state: applicant volume, decision distribution, average scores, bottlenecks, urgency levels        |
| **Trends**                  | Week-over-week and month-over-month changes in application volume, average scores, decision mix, affordability ratios                    |
| **Anomalies**               | Statistically unusual patterns: unexpected score dropoffs, sudden application surges, unusual decision distributions, outlier applicants |
| **Recommendations**         | Actionable suggestions derived from NBA engine and operational inbox, prioritized and grouped by impact                                  |
| **Predictive insights**     | Forecasted outcomes: expected approval rate, projected time-to-decision, likely applicant quality based on historical patterns           |
| **Actionable intelligence** | Direct links from any insight to the corresponding applicant, action, or setting — one click to act                                      |

## Design Principles

1. **Narrative first, numbers second** — The most important insight is communicated in plain English. Numbers support the narrative, not the other way around.
2. **Temporal awareness** — Every metric includes a trend direction (↑, ↓, →) and period comparison (vs last week, vs last month). A static number without context is noise.
3. **Anomaly-gated noise suppression** — Only surface insights that deviate from expected ranges. If everything is normal, the system says "All metrics within normal range" rather than generating fake insights.
4. **Actionable by default** — Every insight card has a direct call to action. "3 applicants stuck in screening → Review screening queue" is actionable. "3 applicants in screening" is not.
5. **Predictive, not prescriptive** — Predictions are directional ("approval rate trending up") with confidence levels, not absolute forecasts. Human judgement is always required.
6. **Progressive disclosure** — Overview dashboard shows 4–6 key metrics. Clicking any metric reveals the trend chart. Clicking the trend chart reveals the underlying data and AI analysis.

## Current Baseline

The codebase already has several pieces that feed into portfolio insights:

### SummaryCards (Existing)

```
6 current metrics: Total applicants, Strong decisions, Manual review, Risk cases, Average score, Affordability
```

These are computed in `applicant-dashboard.tsx` via `useMemo` and passed to `SummaryCards`. No trend direction, no period comparison.

### OperationsReport (Existing — `lib/ai-operations.ts`)

```
generateOperationsReport() → { urgent, actions, bottlenecks, automation, tips, all }
```

The report already categorizes pipeline events across 5 detectors. It powers the PriorityFeed UI.

### Scoring Engine (Existing — `lib/scoring.ts`)

```
calculateApplicantScore() → { totalScore, affordabilityRatio, decision, redFlags, scores }
```

The scoring engine provides per-applicant scores that can be aggregated for portfolio-level analytics.

### AI Analysis (Existing — `lib/openai.ts`)

```
createStructuredOpenAIResponse() → Structured JSON with schema validation
```

Already used for per-applicant AI review and applicant comparison. Can be extended for portfolio-level AI analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Portfolio Insights Engine                        │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Data Collection Layer                                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │  │
│  │  │ Applicant   │  │ Action       │  │ Historical Snapshots │  │  │
│  │  │ Pipeline    │→ │ History      │→ │ (daily aggregates    │  │  │
│  │  │ (current)   │  │ (actions)    │  │  stored in DB)       │  │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                           │                                             │
│                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Analysis Layer                                                 │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │  │
│  │  │ Deterministic  │  │ Trend Analysis │  │ AI-Powered       │  │  │
│  │  │ Aggregations   │→ │ (WoW / MoM)    │→ │ Insights         │  │  │
│  │  │                │  │                │  │ (via OpenAI)     │  │  │
│  │  │ • counts       │  │ • volume Δ     │  │                  │  │  │
│  │  │ • averages     │  │ • score Δ      │  │ • narrative sum. │  │  │
│  │  │ • ratios       │  │ • decision Δ   │  │ • anomaly detect │  │  │
│  │  │ • distributions│  │ • affordability│  │ • predictions    │  │  │
│  │  └────────────────┘  └────────────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                           │                                             │
│                           ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Presentation Layer (Progressive Disclosure)                    │  │
│  │                                                                  │  │
│  │  Level 1: Metric Cards (6–8 key numbers with trend arrows)      │  │
│  │  Level 2: Trend Panels (7-day / 30-day charts per metric)       │  │
│  │  Level 3: AI Insights (narrative summary + anomaly alerts)      │  │
│  │  Level 4: Action Links (one-click to act on any insight)        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Metrics Framework

### Tier 1: Core Metrics (always visible)

| Metric                 | Formula                                          | Trend Source | Action Link             |
| ---------------------- | ------------------------------------------------ | ------------ | ----------------------- |
| Total applicants       | `count(all)`                                     | WoW snapshot | → ApplicantList         |
| New this week          | `count(status === "New", created this week)`     | WoW snapshot | → Filter: New           |
| Strong / Review / Risk | `count(group by decision)`                       | WoW snapshot | → Filter by decision    |
| Avg total score        | `avg(totalScore)`                                | WoW snapshot | → Score breakdown       |
| Pending inspections    | `count(inspectionStatus === "Pending")`          | WoW snapshot | → Filter: pending       |
| Stale screening        | `count(status === "Screening" && daysSince > 7)` | WoW snapshot | → NBA screening action  |
| Approval rate          | `count(Approved) / count(decided)`               | MoM snapshot | → Decision distribution |
| Avg days in pipeline   | `avg(daysSince(createdAt)) by status`            | WoW snapshot | → Bottleneck analysis   |

### Tier 2: Derived Metrics (expandable)

| Metric                | Formula                                              | Purpose                                              |
| --------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Affordability trend   | `avg(affordabilityRatio) over 30 days`               | Detects if income quality is declining               |
| Score volatility      | `stddev(totalScore) over 30 days`                    | Detects if pipeline quality is becoming inconsistent |
| Decision conversion   | `count(Approved) / count(New) lagged 14 days`        | Measures pipeline throughput efficiency              |
| Red flag density      | `avg(length(redFlags))`                              | Detects if applicant quality is declining            |
| Housing support ratio | `count(housingSupport !== "None") / total`           | Portfolio subsidy exposure                           |
| Co-applicant ratio    | `count(coApplicants.length > 0) / total`             | Household application frequency                      |
| Automation rate       | `count(auto_applied actions) / total actions`        | Automation adoption rate                             |
| Feedback positivity   | `count(outcome === "positive") / count(outcome set)` | NBA accuracy over time                               |

## Trend Analysis

### Data Source: Daily Snapshots

A `PortfolioSnapshot` model stores daily aggregate data:

```typescript
interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  organizationId: string;
  metrics: {
    totalApplicants: number;
    newThisWeek: number;
    strongCount: number;
    reviewCount: number;
    riskCount: number;
    avgTotalScore: number;
    avgAffordability: number;
    pendingInspections: number;
    staleScreening: number;
    approvedCount: number;
    rejectedCount: number;
    avgDaysScreening: number;
    redFlagDensity: number;
    housingSupportRatio: number;
    coApplicantRatio: number;
    automationRate: number;
    feedbackPositivity: number;
  };
  createdAt: Date;
}
```

A scheduled job (or on-demand calculation) runs at midnight to capture the daily state. Trend analysis compares against 7-day and 30-day rolling windows.

### Trend Direction Rules

```typescript
type TrendDirection = "up" | "down" | "stable" | "unavailable";
type TrendSignificance = "notable" | "normal" | "critical";

function computeTrend(
  current: number,
  historicalValues: number[],
  threshold: number = 0.1, // 10% change threshold
): {
  direction: TrendDirection;
  change: number;
  significance: TrendSignificance;
} {
  if (historicalValues.length === 0) {
    return { direction: "unavailable", change: 0, significance: "normal" };
  }

  const avg =
    historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length;
  const change = avg > 0 ? (current - avg) / avg : 0;

  let direction: TrendDirection = "stable";
  let significance: TrendSignificance = "normal";

  if (change > threshold) {
    direction = "up";
    significance = Math.abs(change) > 0.25 ? "critical" : "notable";
  } else if (change < -threshold) {
    direction = "down";
    significance = Math.abs(change) > 0.25 ? "critical" : "notable";
  }

  return { direction, change: Math.round(change * 100), significance };
}
```

## Anomaly Detection

### Statistical Methods

Three anomaly detection strategies, applied in order:

#### 1. Z-Score Anomalies (Single-day deviation)

```typescript
function detectZScoreAnomalies(
  metric: string,
  currentValue: number,
  historicalValues: number[],
): Anomaly | null {
  const mean =
    historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length;
  const stdDev = Math.sqrt(
    historicalValues.reduce((s, v) => s + (v - mean) ** 2, 0) /
      historicalValues.length,
  );
  const zScore = stdDev > 0 ? Math.abs(currentValue - mean) / stdDev : 0;

  if (zScore > 3) {
    return {
      metric,
      type: "z-score",
      severity: "critical",
      currentValue,
      expectedRange: [mean - 2 * stdDev, mean + 2 * stdDev],
      description: `${metric} is ${currentValue > mean ? "above" : "below"} normal range (z=${zScore.toFixed(1)}).`,
    };
  }

  if (zScore > 2) {
    return {
      metric,
      type: "z-score",
      severity: "notable",
      currentValue,
      expectedRange: [mean - 2 * stdDev, mean + 2 * stdDev],
      description: `${metric} is moderately outside typical range (z=${zScore.toFixed(1)}).`,
    };
  }

  return null;
}
```

#### 2. Rule-Based Anomalies (Threshold violations)

```typescript
function detectRuleAnomalies(pipeline: PipelineData): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // No applicants
  if (pipeline.totalApplicants === 0 && pipeline.daysSinceLastApplication > 3) {
    anomalies.push({
      metric: "totalApplicants",
      type: "rule",
      severity: "critical",
      currentValue: 0,
      description:
        "No applications received in 3+ days. Check application sources are active.",
    });
  }

  // All applicants are Risk
  if (pipeline.totalApplicants > 3 && pipeline.riskRatio > 0.6) {
    anomalies.push({
      metric: "riskRatio",
      type: "rule",
      severity: "critical",
      currentValue: pipeline.riskRatio,
      description: `>60% of applicants are Risk-rated (${pipeline.riskCount}/${pipeline.totalApplicants}). Review screening thresholds.`,
    });
  }

  // No decisions made recently
  if (
    pipeline.decidedCount === 0 &&
    pipeline.totalApplicants > 5 &&
    pipeline.avgPipelineAge > 14
  ) {
    anomalies.push({
      metric: "decisionRate",
      type: "rule",
      severity: "high",
      currentValue: 0,
      description: "No decisions made on any applicants. Pipeline stalled.",
    });
  }

  // Sudden score drop
  if (pipeline.avgScoreDrop > 15) {
    anomalies.push({
      metric: "avgTotalScore",
      type: "rule",
      severity: "high",
      currentValue: pipeline.avgScoreDrop,
      description: `Average score dropped by ${pipeline.avgScoreDrop} points in the last 7 days. Check applicant quality.`,
    });
  }

  return anomalies;
}
```

#### 3. AI-Assisted Anomalies (Complex patterns)

When rule-based and Z-score detection find nothing, or when multiple subtle anomalies occur simultaneously, AI is invoked:

```typescript
const ANOMALY_AI_PROMPT = `
You are a portfolio analyst reviewing tenant application pipeline data.
Review the current metrics and historical trends below.

Identify any patterns that are unusual but not captured by simple
statistical rules. Focus on:
1. Interaction effects (e.g., rising scores + falling affordability)
2. Cohort effects (e.g., all Risk applicants from one property)
3. Seasonality breaks (e.g., "normally busy in spring, but quiet")
4. Data quality issues (e.g., "suspiciously perfect scores")

Return observations with confidence. If nothing unusual, return empty.
Do not flag patterns already obvious from the data.

Current metrics: {metrics}
Historical averages (7-day): {weekAvg}
Historical averages (30-day): {monthAvg}
`;
```

## Anomaly Model

```typescript
interface Anomaly {
  metric: string;
  type: "z-score" | "rule" | "ai";
  severity: "critical" | "high" | "notable" | "info";
  currentValue: number;
  expectedRange?: [number, number];
  description: string;
  confidence: number; // 0–100
  detectedAt: string;
  relatedApplicants?: string[]; // Links to specific affected applicants
  suggestedAction?: string;
}
```

## Predictive Insights

### Forecast Metrics

```typescript
interface Forecast {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number; // 0–100
  trendDirection: "up" | "down" | "flat";
  timeHorizon: "7d" | "30d";
  factors: string[]; // What drove the prediction
}
```

### Prediction Methods

#### 1. Rolling Average Forecast (Deterministic)

```typescript
function forecastRollingAverage(
  historicalValues: number[],
  window: number = 7,
): { predicted: number; confidence: number } {
  if (historicalValues.length < window) {
    return {
      predicted: historicalValues[historicalValues.length - 1] ?? 0,
      confidence: 50,
    };
  }

  const recent = historicalValues.slice(-window);
  const mean = recent.reduce((s, v) => s + v, 0) / recent.length;
  const variance =
    recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;

  // Lower variance = higher confidence
  const confidence = Math.max(50, Math.min(95, 100 - (variance / mean) * 100));

  return { predicted: Math.round(mean * 10) / 10, confidence };
}
```

#### 2. Linear Trend Forecast (Deterministic)

```typescript
function forecastLinearTrend(
  historicalValues: number[],
  daysAhead: number = 7,
): { predicted: number; slope: number; confidence: number } {
  const n = historicalValues.length;
  if (n < 3) {
    return {
      predicted: historicalValues[n - 1] ?? 0,
      slope: 0,
      confidence: 30,
    };
  }

  // Simple linear regression
  const xMean = (n - 1) / 2;
  const yMean = historicalValues.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = historicalValues[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator > 0 ? numerator / denominator : 0;
  const predicted = historicalValues[n - 1] + slope * daysAhead;

  // R-squared for confidence
  const ssRes = historicalValues.reduce(
    (s, v) =>
      s + (v - (yMean + slope * (historicalValues.indexOf(v) - xMean))) ** 2,
    0,
  );
  const ssTot = historicalValues.reduce((s, v) => s + (v - yMean) ** 2, 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const confidence = Math.max(20, Math.min(90, Math.round(rSquared * 100)));

  return { predicted: Math.round(predicted * 10) / 10, slope, confidence };
}
```

#### 3. AI-Assisted Prediction (Complex scenarios)

When the user requests a narrative forecast or when deterministic methods have low confidence (<60%), AI generates a textual prediction:

```typescript
const PREDICTION_AI_PROMPT = `
You are a portfolio analyst for a property management company.
Based on the following pipeline data and trends, provide a
brief (2-3 sentence) outlook for the coming week/month.

Cover:
1. Expected application volume
2. Likely approval rate trajectory
3. Any upcoming bottlenecks or risks
4. Seasonal factors (if applicable)

Be conservative in your predictions. State confidence level.
Do not make specific numerical predictions — stay directional.

Current data: {metrics}
7-day trend: {weekTrend}
30-day trend: {monthTrend}
`;
```

## Portfolio Insights Report Model

```typescript
interface PortfolioInsightsReport {
  generatedAt: string;
  organizationId: string;
  periodStart: string; // 30 days ago
  periodEnd: string; // today

  // Level 1: Core metrics
  metrics: PortfolioMetric[]; // Each with current value, trend, sparkline data

  // Level 2: Trends
  trends: MetricTrend[]; // WoW and MoM for each core metric

  // Level 3: Anomalies
  anomalies: Anomaly[]; // Detected anomalies, sorted by severity

  // Level 4: AI Narrative
  narrative: {
    summary: string; // 2-3 sentence operational summary
    keyInsights: string[]; // 3-5 bullet points
    predictedOutlook?: string; // AI-generated forecast (optional)
    confidence: string; // "Low" | "Medium" | "High"
  };

  // Recommendations (linked to NBA engine)
  recommendations: InsightRecommendation[];

  // Raw comparison data (for chart rendering)
  comparisonData: {
    currentVsLastWeek: Record<
      string,
      { current: number; previous: number; change: number }
    >;
    currentVsLastMonth: Record<
      string,
      { current: number; previous: number; change: number }
    >;
  };
}

interface PortfolioMetric {
  id: string;
  label: string;
  value: number;
  displayValue: string; // Formatted for display (e.g., "72/100", "$4,200", "+12%")
  trend: TrendDirection;
  changePercent: number;
  significance: TrendSignificance;
  unit: "count" | "percentage" | "score" | "days" | "ratio";
  sparklineData: number[]; // Last 30 data points for mini chart
}

interface InsightRecommendation {
  priority: "P0" | "P1" | "P2" | "info";
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string; // Deep link to relevant section
  source: "anomaly" | "trend" | "prediction" | "rule";
  relatedMetric: string;
}
```

## AI Narrative Generation

The AI narrative is generated on demand (when user clicks "Generate portfolio summary" or when the dashboard loads) using the existing OpenAI infrastructure:

```typescript
async function generatePortfolioNarrative(
  metrics: PortfolioMetric[],
  anomalies: Anomaly[],
  trends: MetricTrend[],
): Promise<{ summary: string; keyInsights: string[] }> {
  return createStructuredOpenAIResponse({
    schemaName: "portfolio_narrative",
    schemaDescription:
      "A brief operational summary of a property management portfolio.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "keyInsights"],
      properties: {
        summary: {
          type: "string",
          description: "2-3 sentence summary of current pipeline health.",
          maxLength: 500,
        },
        keyInsights: {
          type: "array",
          items: { type: "string", maxLength: 200 },
          minItems: 2,
          maxItems: 5,
        },
      },
    },
    input: [
      {
        role: "system",
        content: `You are a portfolio analyst for a property management platform.
Write a brief, factual summary of the current pipeline state.
Do not invent data. Do not use markdown.
Reference specific numbers from the data provided.
If there are anomalies, mention them.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          metrics: metrics.map((m) => ({
            label: m.label,
            value: m.displayValue,
            trend: m.trend,
          })),
          anomalies: anomalies.filter(
            (a) => a.severity === "critical" || a.severity === "high",
          ),
          trends: trends.filter(
            (t) =>
              t.significance === "critical" || t.significance === "notable",
          ),
        }),
      },
    ],
  });
}
```

## UI Interaction Model

### Level 1: Dashboard Summary Cards (Enhanced)

The existing `SummaryCards` component is enhanced with trend arrows and click-to-expand:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Portfolio Overview                              [↻ Refresh]       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │Total │ │Strong│ │Review│ │ Risk │ │Score │ │Afford│          │
│  │  24  │ │  12  │ │   8  │ │   4  │ │72/100│ │ 3.2x │          │
│  │ ↑ 20%│ │ ↑ 8% │ │ ↓ 5% │ │ ↑ 2% │ │ ↑ 3% │ │ → 0% │          │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

### Level 2: Trend Panels (Expandable)

Clicking any metric card expands it to show a trend panel:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ▼ Average Score — 72/100                         [Close ▲]        │
│  ↑ 3% vs last week  |  ↑ 8% vs last month                         │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                             │   │
│  │  80 ┤                                           ╱╲          │   │
│  │  75 ┤                                   ╱╲   ╱  ╲          │   │
│  │  70 ┤              ╱╲      ╱╲    ╱╲   ╱  ╲ ╱    ╲          │   │
│  │  65 ┤   ╱╲       ╱  ╲    ╱  ╲  ╱  ╲ ╱    ╲      ╲         │   │
│  │  60 ┤ ╱    ╲   ╱    ╲  ╱    ╲╱    ╲      ╲        ╲        │   │
│  │     └─────────────────────────────────────────────────      │   │
│  │       Apr 10    Apr 17    Apr 24    May 1    May 8          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Anomaly detected: Score dropped 12 points on Apr 24               │
│  → 2 Risk applicants were entered that day with low scores.       │
│                                                                     │
│  [View applicant detail →]                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Level 3: AI Insights Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│  AI Portfolio Summary                              [Regenerate]    │
│                                                                     │
│  "Pipeline is healthy with 24 active applicants. Average score      │
│   has improved 8% over the last month driven by 12 Strong           │
│   decisions. However, 4 applicants are approaching their move-in    │
│   date without a decision — 2 of these are rated Risk, which        │
│   requires immediate attention."                                    │
│                                                                     │
│  Key Insights:                                                      │
│  • 4 applicants stuck in screening longer than 7 days              │
│  • 1 duplicate fingerprint detected — possible fraud               │
│  • Affordability ratio stable at 3.2x across all applicants        │
│  • Automation rate at 0% — enable auto-status in Admin settings   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ 🔍 Why was this generated?                                  │  │
│  │ Data: 24 applicants, 30-day history, 5 anomalies detected   │  │
│  │ Confidence: High  (80%)                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Level 4: Predictive Insights Panel

```
┌─────────────────────────────────────────────────────────────────────┐
│  📈 7-Day Forecast                          Confidence: Medium     │
│                                                                     │
│  ┌──────────────┬──────────┬──────────┬──────────┬──────────────┐  │
│  │ Metric       │ Current  │ Predicted│ Direction│ Factors      │  │
│  ├──────────────┼──────────┼──────────┼──────────┼──────────────┤  │
│  │ Applications │ 24       │ 28-32    │ ↑ Up     │ Spring season │  │
│  │ Avg Score    │ 72       │ 70-74    │ → Stable │ Quality mix   │  │
│  │ Approval Rt  │ 50%      │ 45-55%   │ → Stable │ Pipeline mix  │  │
│  │ Stale Screen │ 4        │ 2-4      │ ↓ Down   │ Action taken  │  │
│  │ Pending Insp │ 3        │ 3-5      │ → Stable │ Steady inflow │  │
│  └──────────────┴──────────┴──────────┴──────────┴──────────────┘  │
│                                                                     │
│  "Based on current trends, application volume is expected to        │
│   increase 15-30% over the next week (seasonal spring uptick).     │
│   Average scores should remain stable. Recommend addressing the     │
│   4 stale screening applicants before new volume arrives."          │
│                                                                     │
│  [View detailed forecast]                                           │
└─────────────────────────────────────────────────────────────────────┘
```

## Integration with Existing Systems

### With SummaryCards (Existing)

The enhanced metrics feed into the same `SummaryCards` component, adding:

- `trend` (↑ ↓ →) and `changePercent` to each card
- Click handler to expand into trend panel
- Color coding for positive/negative trends

### With Operational Inbox (Existing — `lib/ai-operations.ts`)

The recommendations section is sourced from `generateOperationsReport()`, which already produces categorized items. Insights simply link back to the PriorityFeed items.

### With NBA Engine (Existing — `lib/action-engine.ts`)

Portfolio-level anomalies (e.g., ">60% Risk ratio") create new action rules in the NBA engine:

```typescript
rule({
  id: "portfolio_risk_concentration",
  condition: (a, ctx) => ctx.pipelineStats.approvalRate < 20 && ctx.pipelineStats.totalApplicants > 5,
  priorityBase: "P1",
  confidenceBase: 85,
  requiredFields: [],
  generate: (a, ctx) => ({
    actionType: "review_screening_policy",
    title: `Pipeline risk concentration — ${ctx.pipelineStats.approvalRate}% approval rate`,
    description: `Only ${ctx.pipelineStats.approvalRate}% of ${ctx.pipelineStats.totalApplicants} applicants are approved. Review thresholds.`,
    suggestedAction: "Check screening policy thresholds in Admin settings.",
    priority: "P1",
    explainability: [{
      rule: "portfolio_risk_concentration",
      facts: {
        totalApplicants: ctx.pipelineStats.totalApplicants,
        approvalRate: ctx.pipelineStats.approvalRate,
      },
    }],
    automationSafe: false,
  }),
}),
```

### With OpenAI (Existing — `lib/openai.ts`)

Uses `createStructuredOpenAIResponse()` with the same sanitization, rate limiting, and error handling as other AI features.

### With Snapshot Model

A new `PortfolioSnapshot` model stores daily aggregates:

```typescript
const portfolioSnapshotSchema = new Schema({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },
  date: { type: String, required: true }, // YYYY-MM-DD
  metrics: {
    totalApplicants: Number,
    newThisWeek: Number,
    strongCount: Number,
    reviewCount: Number,
    riskCount: Number,
    avgTotalScore: Number,
    avgAffordability: Number,
    pendingInspections: Number,
    staleScreening: Number,
    approvedCount: Number,
    rejectedCount: Number,
    avgDaysScreening: Number,
    redFlagDensity: Number,
    housingSupportRatio: Number,
    coApplicantRatio: Number,
  },
  createdAt: { type: Date, default: Date.now },
});

portfolioSnapshotSchema.index(
  { organizationId: 1, date: -1 },
  { unique: true },
);
```

## Proposed API Routes

### GET /api/portfolio/insights

Returns the full `PortfolioInsightsReport` for the current organization.

**Query params:**

- `period=7d|30d` — Analysis window (default: 30d)
- `includeAi=true|false` — Whether to generate AI narrative (default: true)

### GET /api/portfolio/trends

Returns sparkline data for each metric (last 30 data points).

### GET /api/portfolio/forecast

Returns predictive forecasts for each metric.

## Key Files (Proposed)

| File                                      | Purpose                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| `lib/portfolio-insights.ts`               | Core engine: metric computation, trend analysis, anomaly detection, forecasting |
| `models/PortfolioSnapshot.ts`             | Mongoose schema for daily aggregate snapshots                                   |
| `app/api/portfolio/insights/route.ts`     | GET — full portfolio insights report                                            |
| `app/api/portfolio/trends/route.ts`       | GET — sparkline/trend data                                                      |
| `app/api/portfolio/forecast/route.ts`     | GET — predictive forecasts                                                      |
| `components/portfolio/insight-card.tsx`   | Level 1 enhanced metric card with trend arrow + click-to-expand                 |
| `components/portfolio/trend-panel.tsx`    | Level 2 expandable trend chart                                                  |
| `components/portfolio/ai-summary.tsx`     | Level 3 AI narrative panel                                                      |
| `components/portfolio/forecast-panel.tsx` | Level 4 predictive forecast panel                                               |
| `components/portfolio/anomaly-alert.tsx`  | Anomaly notification with severity color                                        |

## Existing Code That Already Supports Portfolio Insights

| Existing File                            | Contribution                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `components/dashboard/summary-cards.tsx` | 6 core metrics display — foundation for Level 1                            |
| `components/dashboard/priority-feed.tsx` | Priority-filtered event feed — feeds recommendations                       |
| `lib/ai-operations.ts`                   | `generateOperationsReport()` — supplies operational context                |
| `lib/action-engine.ts`                   | Pipeline statistics, approval rate, screening age                          |
| `lib/scoring.ts`                         | Per-applicant scoring — aggregates into portfolio metrics                  |
| `lib/ai-types.ts`                        | Zod schemas for AI output validation                                       |
| `lib/openai.ts`                          | `createStructuredOpenAIResponse()` — AI narrative generation               |
| `lib/audit-log.ts`                       | `recordAuditLog()` — audit insight generation events                       |
| `lib/utils.ts`                           | `formatPercent()`, `formatCurrency()`, `formatDate()` — display formatting |

## Existing Gaps & Implementation Path

| Gap                       | Current State                   | Implementation Required                            |
| ------------------------- | ------------------------------- | -------------------------------------------------- |
| Trend arrows              | Metrics are static numbers only | Add WoW/MoM computation based on snapshot history  |
| Sparkline data            | No historical data store        | Create `PortfolioSnapshot` model + snapshot job    |
| Anomaly detection         | Manual only (operational inbox) | Build Z-score + rule-based + AI anomaly detectors  |
| AI narrative              | Per-applicant only              | Add portfolio-level AI prompt + structured output  |
| Predictive forecasts      | None                            | Build rolling average + linear trend + AI forecast |
| Metric card interactivity | Static cards                    | Add click-to-expand, trend panel, anomaly links    |

## Fulfillment Table

| Requirement                 | How It's Met                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Operational summaries**   | AI-generated 2-3 sentence narrative covering pipeline health, key changes, and flagged items. Deterministic metric cards always visible.                             |
| **Trends**                  | WoW and MoM trend direction (↑↓→) for all 8 core metrics. Sparkline data (30 days) for chart rendering. Trend significance classification (normal/notable/critical). |
| **Anomalies**               | 3-layer detection: Z-score (statistical outliers), rule-based (threshold violations), AI-assisted (complex patterns). Severity: critical/high/notable/info.          |
| **Recommendations**         | Sourced from existing NBA engine + operational inbox. Portfolio-level anomalies create new NBA rules. Each insight has a direct action link.                         |
| **Predictive insights**     | 3 methods: rolling average (deterministic), linear trend (deterministic), AI narrative (directional). 7-day horizon with confidence levels.                          |
| **Actionable intelligence** | Every insight links to a specific action: filter applicants, review action card, adjust settings, or view applicant detail. One click from insight to action.        |
