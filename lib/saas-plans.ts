export type PlanKey = "free" | "starter" | "pro" | "business" | "enterprise";

export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "inactive";

export type PremiumFeature =
  | "aiSummary"
  | "aiDocumentExtraction"
  | "applicantComparison"
  | "pdfReports"
  | "teamMembers"
  | "multiPropertyReporting"
  | "whiteLabel";

export type CustomerType =
  | "Landlord Mode"
  | "Realtor Mode"
  | "Property Manager Mode"
  | "Owner Mode"
  | "Leasing Agent Mode"
  | "Team Mode";

export const customerTypes: CustomerType[] = [
  "Landlord Mode",
  "Realtor Mode",
  "Property Manager Mode",
  "Owner Mode",
  "Leasing Agent Mode",
  "Team Mode",
];

export const planCatalog: Record<
  PlanKey,
  {
    key: PlanKey;
    name: string;
    priceLabel: string;
    monthlyPrice: number | null;
    applicantLimit: number | null;
    stripePriceEnv?: string;
    badge: string;
    description: string;
    features: string[];
    unlockedFeatures: PremiumFeature[];
  }
> = {
  free: {
    key: "free",
    name: "Free Trial",
    priceLabel: "7-day trial",
    monthlyPrice: 0,
    applicantLimit: 3,
    badge: "Trial",
    description: "A focused trial for proving the workflow with real applicants.",
    features: [
      "Up to 3 applicants",
      "Basic applicant scoring",
      "Basic dashboard",
      "Demo AI mode when no OpenAI key is configured",
    ],
    unlockedFeatures: ["aiSummary"],
  },
  starter: {
    key: "starter",
    name: "Starter",
    priceLabel: "$29/mo",
    monthlyPrice: 29,
    applicantLimit: 10,
    stripePriceEnv: "STRIPE_STARTER_PRICE_ID",
    badge: "Starter",
    description: "For small landlords organizing applicants faster.",
    features: [
      "Up to 10 applicants/month",
      "Basic scoring",
      "Applicant Readiness Meter",
      "Message templates",
      "Basic AI summaries",
    ],
    unlockedFeatures: ["aiSummary"],
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceLabel: "$79/mo",
    monthlyPrice: 79,
    applicantLimit: 50,
    stripePriceEnv: "STRIPE_PRO_PRICE_ID",
    badge: "Most popular",
    description: "For active landlords, realtors, and owners who want AI review, comparison, and owner reports.",
    features: [
      "Up to 50 applicants/month",
      "Ninja Decision Score",
      "Messy Info Extractor",
      "One-Click Follow-Up",
      "Applicant comparison",
      "Owner Presentation Mode",
      "AI red flag review",
    ],
    unlockedFeatures: [
      "aiSummary",
      "aiDocumentExtraction",
      "applicantComparison",
    ],
  },
  business: {
    key: "business",
    name: "Business",
    priceLabel: "$149/mo",
    monthlyPrice: 149,
    applicantLimit: 200,
    stripePriceEnv: "STRIPE_BUSINESS_PRICE_ID",
    badge: "Team",
    description: "For property managers and leasing teams managing multiple properties.",
    features: [
      "Up to 200 applicants/month",
      "Multi-property support",
      "Team workspace",
      "PDF reports",
      "Advanced AI Copilot",
      "Saved screening criteria",
      "Priority workflow suggestions",
    ],
    unlockedFeatures: [
      "aiSummary",
      "aiDocumentExtraction",
      "applicantComparison",
      "pdfReports",
      "teamMembers",
      "multiPropertyReporting",
    ],
  },
  enterprise: {
    key: "enterprise",
    name: "Agency",
    priceLabel: "$299/mo or custom",
    monthlyPrice: 299,
    applicantLimit: null,
    stripePriceEnv: "STRIPE_ENTERPRISE_PRICE_ID",
    badge: "Custom",
    description: "For real estate offices and portfolio operators.",
    features: [
      "Unlimited or high-volume applicants",
      "Multi-office support",
      "White-label options",
      "Advanced reporting",
      "Priority support",
      "Custom onboarding",
    ],
    unlockedFeatures: [
      "aiSummary",
      "aiDocumentExtraction",
      "applicantComparison",
      "pdfReports",
      "teamMembers",
      "multiPropertyReporting",
      "whiteLabel",
    ],
  },
};

export function normalizePlan(plan?: string | null): PlanKey {
  if (plan === "starter" || plan === "pro" || plan === "business" || plan === "enterprise") {
    return plan;
  }

  return "free";
}

export function getPlan(plan?: string | null) {
  return planCatalog[normalizePlan(plan)];
}

export function canUseFeature(plan: string | null | undefined, feature: PremiumFeature) {
  return getPlan(plan).unlockedFeatures.includes(feature);
}

export function getApplicantUsage(applicantCount: number, plan?: string | null) {
  const currentPlan = getPlan(plan);
  const limit = currentPlan.applicantLimit;
  const ratio = limit ? Math.min(100, Math.round((applicantCount / limit) * 100)) : 0;

  return {
    count: applicantCount,
    limit,
    ratio,
    isUnlimited: limit === null,
    isAtLimit: limit !== null && applicantCount >= limit,
    remaining: limit === null ? null : Math.max(0, limit - applicantCount),
  };
}

export function formatPlanLimit(plan?: string | null) {
  const limit = getPlan(plan).applicantLimit;
  return limit === null ? "Unlimited applicants" : `${limit} applicants/month`;
}
