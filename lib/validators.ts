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

export const coApplicantSchema = z.object({
  name: z.string().trim().min(2, "Co-applicant name is required."),
  email: z.union([z.literal(""), z.email("Enter a valid co-applicant email address.")]).default(""),
  phone: z.string().trim().max(40).default(""),
  monthlyIncome: z.coerce.number().nonnegative().default(0),
  residentScore: z.coerce.number().min(0).max(850).default(0),
  notes: z.string().trim().max(500).default("")
});

export const applicantSchema = z.object({
  name: z.string().trim().min(2, "Applicant name is required."),
  email: z.email("Valid email is required.").transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7, "Phone is required."),
  propertyAddress: z.string().trim().max(200).default(""),
  propertyCity: z.string().trim().max(120).default(""),
  propertyState: z.string().trim().max(60).default(""),
  propertyPostalCode: z.string().trim().max(20).default(""),
  moveInDate: z.string().trim().max(20).default(""),
  coApplicants: z.array(coApplicantSchema).max(4, "Up to 4 co-applicants are supported.").default([]),
  monthlyRent: z.coerce.number().nonnegative(),
  monthlyIncome: z.coerce.number().nonnegative(),
  housingSupport: z.enum(housingSupportValues).default("None"),
  supportProgram: z.string().trim().max(120).default(""),
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
  notes: z.union([z.string().trim().max(5000), z.array(z.string().trim().min(1).max(500))]).optional().default(""),
  status: z.enum(applicantStatusValues).default("New")
});

export type ApplicantInput = z.infer<typeof applicantSchema>;
