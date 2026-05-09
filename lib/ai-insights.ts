import type { ApplicantRecord } from "@/components/dashboard/applicant-list";

// ── 2B: Email Template Generator ─────────────────────────────────────────────

export interface EmailTemplate {
  subject: string;
  body: string;
  type: "approval" | "rejection" | "request_info" | "follow_up" | "welcome";
}

export function generateEmailTemplate(
  a: ApplicantRecord,
  type: EmailTemplate["type"],
): EmailTemplate {
  const aff =
    a.monthlyRent > 0 ? (a.monthlyIncome / a.monthlyRent).toFixed(1) : "N/A";
  const templates: Record<EmailTemplate["type"], EmailTemplate> = {
    approval: { type: "approval",
      subject: `Application Approved — ${a.propertyAddress || "Your Rental Application"}`,
      body: `Dear ${a.name},\n\nWe're pleased to inform you that your rental application for ${a.propertyAddress || "the property"} has been approved.\n\nYour application scored ${a.totalScore}/100 with a ${a.decision} recommendation. Your household income of $${a.monthlyIncome.toLocaleString()}/month provides ${aff}x rent coverage.\n\nNext Steps:\n- Review and sign the lease agreement\n- Schedule move-in inspection\n- Provide proof of renter's insurance\n\nWe'll be in touch shortly with the lease documents. If you have any questions, please reply to this email.\n\nBest regards,\nProperty Management Team`,
    },
    rejection: { type: "rejection",
      subject: `Application Update — ${a.propertyAddress || "Your Rental Application"}`,
      body: `Dear ${a.name},\n\nThank you for applying for ${a.propertyAddress || "the rental property"}. After careful review, we are unable to approve your application at this time.\n\nThis decision was based on ${a.redFlags.length > 0 ? `the following factors: ${a.redFlags.join("; ")}.` : "our standard screening criteria."}\n\nWe encourage you to reapply in the future if your circumstances change. If you believe there has been an error, you may request a copy of your screening report.\n\nBest regards,\nProperty Management Team`,
    },
    request_info: { type: "request_info",
      subject: `Additional Information Needed — ${a.propertyAddress || "Your Application"}`,
      body: `Dear ${a.name},\n\nWe're reviewing your rental application for ${a.propertyAddress || "the property"} and need a few more details to complete our screening.\n\nSpecifically, we need:\n${a.scores.resident === 0 ? "- Your most recent credit/screening report\n" : ""}${a.scores.rentalHistory === 0 ? "- Rental history or landlord references\n" : ""}${!a.phone ? "- A current phone number\n" : ""}\nPlease provide these at your earliest convenience so we can continue processing your application.\n\nThank you,\nProperty Management Team`,
    },
    follow_up: { type: "follow_up",
      subject: `Checking In — ${a.propertyAddress || "Your Application Status"}`,
      body: `Dear ${a.name},\n\nJust following up on your rental application for ${a.propertyAddress || "the property"}. Our records show your application is in "${a.status}" status as of ${new Date(a.updatedAt).toLocaleDateString()}.\n\nIf you've already sent the requested documents, thank you — we'll review them shortly. If you still need to submit anything, please do so at your earliest convenience.\n\nFeel free to reply with any questions.\n\nBest regards,\nProperty Management Team`,
    },
    welcome: { type: "welcome",
      subject: `Welcome! — Application Received for ${a.propertyAddress || "Your Application"}`,
      body: `Dear ${a.name},\n\nThank you for submitting your rental application for ${a.propertyAddress || "the property"}. We've received it and it's now in our screening queue.\n\nYour application will be reviewed within 2-3 business days. You'll receive updates as we process it.\n\nIn the meantime, please keep an eye out for any requests for additional information.\n\nBest regards,\nProperty Management Team`,
    },
  };
  return templates[type];
}

// ── 2C: Pipeline Analytics ──────────────────────────────────────────────────

export interface PipelineAnalytics {
  totalApplicants: number;
  decisionBreakdown: { strong: number; review: number; risk: number };
  statusBreakdown: Record<string, number>;
  avgScore: number;
  avgAffordability: number;
  avgDaysToDecision: number;
  sourceEffectiveness: { source: string; count: number; avgScore: number }[];
  approvalRate: number;
  screeningBottleneckDays: number;
}

export function computePipelineAnalytics(
  applicants: ApplicantRecord[],
): PipelineAnalytics {
  if (applicants.length === 0)
    return {
      totalApplicants: 0,
      decisionBreakdown: { strong: 0, review: 0, risk: 0 },
      statusBreakdown: {},
      avgScore: 0,
      avgAffordability: 0,
      avgDaysToDecision: 0,
      sourceEffectiveness: [],
      approvalRate: 0,
      screeningBottleneckDays: 0,
    };

  const strong = applicants.filter((a) => a.decision === "Strong");
  const review = applicants.filter((a) => a.decision === "Review");
  const risk = applicants.filter((a) => a.decision === "Risk");
  const approved = applicants.filter((a) => a.status === "Approved");

  const statusBreakdown: Record<string, number> = {};
  for (const a of applicants) {
    statusBreakdown[a.status] = (statusBreakdown[a.status] || 0) + 1;
  }

  const avgScore = Math.round(
    applicants.reduce((s, a) => s + a.totalScore, 0) / applicants.length,
  );
  const avgAff =
    applicants
      .filter((a) => a.monthlyRent > 0)
      .reduce((s, a) => s + a.monthlyIncome / a.monthlyRent, 0) /
    (applicants.filter((a) => a.monthlyRent > 0).length || 1);

  const screeningApps = applicants.filter((a) => a.status === "Screening");
  const avgScreenDays =
    screeningApps.length > 0
      ? Math.round(
          screeningApps.reduce(
            (s, a) =>
              s + (Date.now() - new Date(a.updatedAt).getTime()) / 86_400_000,
            0,
          ) / screeningApps.length,
        )
      : 0;

  const sourceMap = new Map<string, { count: number; score: number }>();
  for (const a of applicants) {
    const src = a.applicationSource || "Unknown";
    const entry = sourceMap.get(src) || { count: 0, score: 0 };
    entry.count++;
    entry.score += a.totalScore;
    sourceMap.set(src, entry);
  }
  const sourceEffectiveness = Array.from(sourceMap.entries())
    .map(([source, d]) => ({
      source,
      count: d.count,
      avgScore: Math.round(d.score / d.count),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return {
    totalApplicants: applicants.length,
    decisionBreakdown: {
      strong: strong.length,
      review: review.length,
      risk: risk.length,
    },
    statusBreakdown,
    avgScore,
    avgAffordability: avgAff,
    avgDaysToDecision: avgScreenDays,
    sourceEffectiveness,
    approvalRate:
      applicants.length > 0
        ? Math.round((approved.length / applicants.length) * 100)
        : 0,
    screeningBottleneckDays: avgScreenDays,
  };
}

// ── 3A: Document Verification / Fraud Signals ───────────────────────────────

export interface FraudSignal {
  type: string;
  detail: string;
  severity: "low" | "medium" | "high";
  applicantId: string;
  applicantName: string;
}

export interface IncomeVerification {
  applicantId: string;
  applicantName: string;
  statedIncome: number;
  rentObligation: number;
  ratio: number;
  level: string;
  verifiedByDocs: boolean;
  recommendation: string;
}

export function detectFraudSignals(
  applicants: ApplicantRecord[],
): FraudSignal[] {
  const signals: FraudSignal[] = [];
  const emailMap = new Map<string, string[]>();
  const phoneMap = new Map<string, string[]>();
  for (const a of applicants) {
    if (a.email) {
      const e = a.email.toLowerCase();
      if (!emailMap.has(e)) emailMap.set(e, []);
      emailMap.get(e)!.push(a._id);
    }
    if (a.phone) {
      const p = a.phone.replace(/\D/g, "");
      if (p.length >= 7) {
        if (!phoneMap.has(p)) phoneMap.set(p, []);
        phoneMap.get(p)!.push(a._id);
      }
    }
  }
  for (const [email, ids] of emailMap) {
    if (ids.length > 1)
      signals.push({
        type: "duplicate_email",
        detail: `Email "${email}" appears on ${ids.length} applications.`,
        severity: "medium",
        applicantId: ids[0],
        applicantName:
          applicants.find((a) => a._id === ids[0])?.name || "Unknown",
      });
  }
  for (const [phone, ids] of phoneMap) {
    if (ids.length >= 3)
      signals.push({
        type: "shared_phone",
        detail: `Phone appears on ${ids.length} applications.`,
        severity: "high",
        applicantId: ids[0],
        applicantName:
          applicants.find((a) => a._id === ids[0])?.name || "Unknown",
      });
  }
  for (const a of applicants) {
    if (
      a.applicationSource === "Apartments.com" &&
      a.residentScore > 0 &&
      a.residentScore < 100
    ) {
      signals.push({
        type: "unusual_score",
        detail: `${a.name}: Apartments.com ResidentScore ${a.residentScore} — expected 350-850 range for Apartments.com reports.`,
        severity: "low",
        applicantId: a._id,
        applicantName: a.name,
      });
    }
  }
  return signals;
}

export function verifyIncome(a: ApplicantRecord): IncomeVerification {
  const aff = a.monthlyRent > 0 ? a.monthlyIncome / a.monthlyRent : 0;
  const level =
    aff >= 4
      ? "Excellent"
      : aff >= 3
        ? "Good"
        : aff >= 2
          ? "Adequate"
          : "Risky";
  const verified = a.scores.income >= 80;
  return {
    applicantId: a._id,
    applicantName: a.name,
    statedIncome: a.monthlyIncome,
    rentObligation: a.monthlyRent,
    ratio: aff,
    level,
    verifiedByDocs: verified,
    recommendation: verified
      ? "Income verified — documentation supports stated income."
      : "Income not independently verified — request pay stubs or bank statements.",
  };
}

// ── 3B: Landlord Preference Learning ────────────────────────────────────────

export interface PreferenceInsight {
  type: string;
  title: string;
  description: string;
  data: string;
  suggestion: string;
}

export function learnPreferences(
  applicants: ApplicantRecord[],
): PreferenceInsight[] {
  const insights: PreferenceInsight[] = [];
  if (applicants.length < 5) return insights;
  const approved = applicants.filter((a) => a.status === "Approved");
  const rejected = applicants.filter((a) => a.status === "Rejected");
  if (approved.length >= 3) {
    const avgAff =
      approved.reduce(
        (s, a) => s + (a.monthlyRent > 0 ? a.monthlyIncome / a.monthlyRent : 0),
        0,
      ) / approved.length;
    const currentMin = 3.0;
    if (avgAff > currentMin + 0.5)
      insights.push({
        type: "threshold_up",
        title: "Affordability preferences detected",
        description: `Approved applicants average ${avgAff.toFixed(1)}x income-to-rent — well above the ${currentMin}x minimum.`,
        data: `${approved.length} approved applicants. Avg affordability: ${avgAff.toFixed(1)}x.`,
        suggestion: `Consider raising your minimum affordability ratio to ${Math.floor(avgAff)}x in Admin → Screening Policy. This would filter out borderline applicants earlier.`,
      });
  }
  if (approved.length >= 3) {
    const avgScore =
      approved.reduce((s, a) => s + a.totalScore, 0) / approved.length;
    if (avgScore > 85)
      insights.push({
        type: "threshold_score",
        title: "Score preferences detected",
        description: `Approved applicants average ${Math.round(avgScore)}/100.`,
        data: `${approved.length} approved applicants. Avg score: ${Math.round(avgScore)}/100.`,
        suggestion:
          "Your approvals cluster at high scores. Consider tightening your Strong threshold for faster decisions.",
      });
  }
  if (rejected.length >= 3) {
    const sources = new Map<string, number>();
    for (const a of rejected) {
      const s = a.applicationSource || "Unknown";
      sources.set(s, (sources.get(s) || 0) + 1);
    }
    const topRejectedSource = Array.from(sources.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0];
    if (topRejectedSource && topRejectedSource[1] >= 3) {
      insights.push({
        type: "source_risk",
        title: "Source risk pattern detected",
        description: `${topRejectedSource[1]} rejected applicants came from "${topRejectedSource[0]}" — ${Math.round((topRejectedSource[1] / rejected.length) * 100)}% of all rejections.`,
        data: `${topRejectedSource[1]} of ${rejected.length} rejections from "${topRejectedSource[0]}".`,
        suggestion: `Consider reviewing applications from "${topRejectedSource[0]}" more carefully, or adding a pre-screening step for this source.`,
      });
    }
  }
  const duplicateEmails = new Map<string, number>();
  for (const a of applicants) {
    if (a.email) {
      const e = a.email.toLowerCase();
      duplicateEmails.set(e, (duplicateEmails.get(e) || 0) + 1);
    }
  }
  const dupes = Array.from(duplicateEmails.entries()).filter(([, c]) => c > 1);
  if (dupes.length >= 1)
    insights.push({
      type: "duplicate_behavior",
      title: "Duplicate applications detected",
      description: `${dupes.length} email(s) appear on multiple applications.`,
      data: dupes.map(([e, c]) => `${e}: ${c} applications`).join(", "),
      suggestion:
        "Enable the duplicate applicant guard in Admin → Intake Controls to automatically flag repeat applications.",
    });
  return insights;
}

// ── 3C: Market Comparison (Portfolio-level, no external API) ─────────────────

export interface MarketComparison {
  applicantName: string;
  metric: string;
  applicantValue: string;
  portfolioAverage: string;
  position: "above" | "average" | "below";
}

export function compareToPortfolio(
  a: ApplicantRecord,
  all: ApplicantRecord[],
): MarketComparison[] {
  if (all.length < 2) return [];
  const aff = a.monthlyRent > 0 ? a.monthlyIncome / a.monthlyRent : 0;
  const avgAff =
    all
      .filter((x) => x.monthlyRent > 0)
      .reduce((s, x) => s + x.monthlyIncome / x.monthlyRent, 0) /
    (all.filter((x) => x.monthlyRent > 0).length || 1);
  const avgScore = Math.round(
    all.reduce((s, x) => s + x.totalScore, 0) / all.length,
  );
  return [
    {
      applicantName: a.name,
      metric: "Total Score",
      applicantValue: `${a.totalScore}/100`,
      portfolioAverage: `${avgScore}/100`,
      position:
        a.totalScore > avgScore
          ? "above"
          : a.totalScore === avgScore
            ? "average"
            : "below",
    },
    {
      applicantName: a.name,
      metric: "Affordability",
      applicantValue: `${aff.toFixed(1)}x`,
      portfolioAverage: `${avgAff.toFixed(1)}x`,
      position:
        aff > avgAff
          ? "above"
          : Math.abs(aff - avgAff) < 0.5
            ? "average"
            : "below",
    },
  ];
}
