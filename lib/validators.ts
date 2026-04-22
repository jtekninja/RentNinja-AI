import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.email("Enter a valid email address.").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters."),
  organizationName: z.string().trim().min(2, "Organization name is required.")
});

export const noteSchema = z.object({
  body: z.string().trim().min(1).max(500)
});

export const applicantSchema = z.object({
  name: z.string().trim().min(2, "Applicant name is required."),
  email: z.email("Valid email is required.").transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(7, "Phone is required."),
  monthlyRent: z.coerce.number().positive("Monthly rent must be greater than 0."),
  monthlyIncome: z.coerce.number().nonnegative(),
  creditScore: z.coerce.number().min(300).max(850),
  rentalHistoryScore: z.coerce.number().min(0).max(100),
  rulesComplianceScore: z.coerce.number().min(0).max(100),
  timelineScore: z.coerce.number().min(0).max(100),
  communicationScore: z.coerce.number().min(0).max(100),
  documentationScore: z.coerce.number().min(0).max(100),
  notes: z.union([z.string().trim().max(500), z.array(z.string().trim().min(1).max(500))]).optional().default(""),
  status: z.enum(["New", "Screening", "Approved", "Review", "Rejected"]).default("New")
});

export type ApplicantInput = z.infer<typeof applicantSchema>;

