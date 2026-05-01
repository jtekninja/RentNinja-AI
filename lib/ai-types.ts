import { z } from "zod";

export const extractedCoApplicantSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  monthlyIncome: z.number(),
  residentScore: z.number().default(0),
  notes: z.string()
});

export const applicantAiAnalysisSchema = z.object({
  summary: z.string(),
  recommendation: z.enum(["Approve", "Review", "Decline"]),
  confidence: z.enum(["Low", "Medium", "High"]),
  strengths: z.array(z.string()).min(1).max(5),
  concerns: z.array(z.string()).min(1).max(5),
  followUpQuestions: z.array(z.string()).min(1).max(5)
});

export type ApplicantAiAnalysis = z.infer<typeof applicantAiAnalysisSchema>;

export const applicantComparisonSchema = z.object({
  bestApplicantId: z.string(),
  ranking: z.array(
    z.object({
      applicantId: z.string(),
      rank: z.number().int().positive(),
      reason: z.string()
    })
  ),
  overview: z.string(),
  watchouts: z.array(z.string()).min(1).max(6),
  nextStep: z.string()
});

export type ApplicantComparison = z.infer<typeof applicantComparisonSchema>;

export const extractedApplicantSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  propertyAddress: z.string().default(""),
  propertyPostalCode: z.string().default(""),
  moveInDate: z.string().default(""),
  coApplicants: z.array(extractedCoApplicantSchema),
  monthlyRent: z.number(),
  monthlyIncome: z.number(),
  housingSupport: z.enum(["None", "Voucher", "Subsidy"]),
  supportProgram: z.string(),
  monthlySubsidyAmount: z.number(),
  tenantPortionRent: z.number(),
  subsidyStatus: z.enum(["N/A", "Pending", "Verified"]),
  inspectionStatus: z.enum(["N/A", "Pending", "Passed", "Failed"]),
  residentScore: z.number(),
  rentalHistoryScore: z.number(),
  rulesComplianceScore: z.number(),
  timelineScore: z.number(),
  communicationScore: z.number(),
  documentationScore: z.number(),
  applicationSource: z.enum(["Apartments.com", "Zillow", "TurboTenant", "RentSpree", "Avail", "Email / Manual", "Other"]),
  status: z.enum(["New", "Screening", "Approved", "Review", "Rejected"]),
  notes: z.array(z.string()),
  missingItems: z.array(z.string()),
  extractionSummary: z.string()
});

export type ExtractedApplicant = z.infer<typeof extractedApplicantSchema>;
