import { z } from "zod";

export const applicationSourceValues = ["Apartments.com", "Zillow", "TurboTenant", "RentSpree", "Avail", "Email / Manual", "Other"] as const;
export const housingSupportValues = ["None", "Voucher", "Subsidy"] as const;
export const verificationStatusValues = ["N/A", "Pending", "Verified"] as const;
export const inspectionStatusValues = ["N/A", "Pending", "Passed", "Failed"] as const;
export const customerTypeValues = ["Landlord", "Realtor", "Property Manager", "Property Owner", "Leasing Agent", "Real Estate Team", "Other"] as const;
export const applicantStatusValues = [
  "New",
  "Pre-screening",
  "Missing Documents",
  "Ready for Review",
  "Tour Scheduled",
  "Owner Review",
  "Strong Candidate",
  "Manual Review",
  "Approved",
  "Declined",
  "Leased",
  "Archived",
  "Screening",
  "Review",
  "Rejected"
] as const;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters."),
  organizationName: z.string().trim().min(2, "Organization name is required."),
  customerType: z.enum(customerTypeValues).default("Landlord")
});

export const adminUserCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._-]{3,30}$/, "Username must be 3-30 characters and use letters, numbers, dots, dashes, or underscores.")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["owner", "member"]).default("member")
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(["owner", "member"]).optional(),
  password: z.string().min(8, "Password must be at least 8 characters.").optional()
});

export const adminWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters."),
  businessProfile: z.object({
    legalName: z.string().trim().max(120).default(""),
    supportEmail: z.union([z.literal(""), z.email("Enter a valid support email address.")]).default(""),
    supportPhone: z.string().trim().max(40).default(""),
    website: z.string().trim().max(160).default("")
  }),
  complianceSettings: z.object({
    defaultPropertyCity: z.string().trim().max(120).default(""),
    defaultPropertyState: z.string().trim().max(60).default(""),
    useClearBackgroundChecksAsPositiveSignal: z.boolean(),
    allowCriminalHistoryScoreImpact: z.boolean(),
    allowRegistryScoreImpact: z.boolean(),
    allowOfacScoreImpact: z.boolean(),
    requireManualReviewForConsumerReportFindings: z.boolean()
  }),
  screeningPolicy: z.object({
    minAffordabilityRatio: z.coerce.number().min(1).max(10),
    minResidentScore: z.coerce.number().min(0).max(850),
    strongScoreThreshold: z.coerce.number().min(1).max(100),
    reviewScoreThreshold: z.coerce.number().min(1).max(100),
    requireIncomeDocs: z.boolean(),
    requireGovernmentId: z.boolean(),
    requireLandlordReference: z.boolean()
  }),
  intakeSettings: z.object({
    enabledSources: z.array(z.enum(applicationSourceValues)).min(1, "Enable at least one intake source."),
    duplicatePolicy: z.enum(["block", "warn"])
  })
});

export const noteSchema = z.object({
  body: z.string().trim().min(1).max(500)
});

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).optional().default("");

const optionalTextList = (maxLength: number) =>
  z.array(z.string().trim().min(1).max(maxLength)).optional().default([]);

const incomeFrequencyValues = ["hourly", "weekly", "biweekly", "monthly", "yearly", "unknown"] as const;

const finiteNumber = (fallback = 0) =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }, z.number().nonnegative());

const nullableFiniteNumber = z
  .preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }, z.number().nonnegative().nullable())
  .optional()
  .default(null);

export const coApplicantSchema = z.object({
  name: z.string().trim().min(2, "Co-applicant name is required.").max(150),
  email: z.union([z.literal(""), z.email("Enter a valid co-applicant email address.").max(150)]).default(""),
  phone: z.string().trim().max(50).default(""),
  monthlyIncome: z.coerce.number().nonnegative().default(0),
  residentScore: z.coerce.number().min(0).max(850).default(0),
  notes: z.string().trim().max(5000).default("")
});

export const applicantSchema = z.object({
  name: z.string().trim().min(2, "Applicant name is required.").max(150),
  email: z.email("Valid email is required.").max(150).transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7, "Phone is required.").max(50),
  propertyAddress: z.string().trim().max(200).default(""),
  propertyCity: z.string().trim().max(120).default(""),
  propertyState: z.string().trim().max(60).default(""),
  propertyPostalCode: z.string().trim().max(20).default(""),
  moveInDate: z.string().trim().max(150).default(""),
  coApplicants: z.array(coApplicantSchema).max(4, "Up to 4 co-applicants are supported.").default([]),
  monthlyRent: finiteNumber(0),
  monthlyIncome: finiteNumber(0),
  incomeAmount: nullableFiniteNumber,
  incomeFrequency: z.enum(incomeFrequencyValues).optional().default("unknown"),
  normalizedMonthlyIncome: nullableFiniteNumber,
  incomeToRentRatio: nullableFiniteNumber,
  housingSupport: z.enum(housingSupportValues).default("None"),
  supportProgram: z.string().trim().max(150).default(""),
  monthlySubsidyAmount: z.coerce.number().nonnegative().default(0),
  tenantPortionRent: z.coerce.number().nonnegative().default(0),
  subsidyStatus: z.enum(verificationStatusValues).default("N/A"),
  inspectionStatus: z.enum(inspectionStatusValues).default("N/A"),
  creditScore: z.coerce.number().min(0).max(850).optional().default(0),
  residentScore: z.coerce.number().min(0).max(850),
  rentalHistoryScore: z.coerce.number().min(0).max(100),
  rulesComplianceScore: z.coerce.number().min(0).max(100),
  timelineScore: z.coerce.number().min(0).max(100),
  communicationScore: z.coerce.number().min(0).max(100),
  documentationScore: z.coerce.number().min(0).max(100),
  applicationSource: z.enum(applicationSourceValues).default("Email / Manual"),
  rawText: optionalText(10000),
  suggestedMessage: optionalText(5000),
  extractedFieldSummary: optionalText(5000),
  summary: optionalText(5000),
  concerns: optionalTextList(3000),
  strengths: optionalTextList(3000),
  missingDocuments: optionalTextList(3000),
  nextStep: optionalText(2000),
  confidenceLevel: z.enum(["Low", "Medium", "High"]).optional().default("Medium"),
  confidenceReason: optionalText(2000),
  readiness: z.coerce.number().min(0).max(100).optional().default(0),
  riskLevel: z.enum(["Low", "Medium", "High"]).optional().default("Medium"),
  notes: z.union([z.string().trim().max(5000), z.array(z.string().trim().min(1).max(5000))]).optional().default(""),
  status: z.enum(applicantStatusValues).default("New")
});

export type ApplicantInput = z.infer<typeof applicantSchema>;
