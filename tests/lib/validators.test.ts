import { describe, it, expect } from "vitest";
import { applicantSchema, registerSchema } from "@/lib/validators";

describe("registerSchema", () => {
  it("validates correct registration data", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      organizationName: "Test Org",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "short",
      organizationName: "Test Org",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("8 characters");
    }
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Test User",
      email: "not-an-email",
      password: "password123",
      organizationName: "Test Org",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "test@example.com",
      password: "password123",
      organizationName: "Test Org",
    });
    expect(result.success).toBe(false);
  });
});

describe("applicantSchema", () => {
  it("validates a complete applicant", () => {
    const result = applicantSchema.safeParse({
      name: "Nina Patel",
      email: "nina@example.com",
      phone: "212-555-0141",
      monthlyRent: 2400,
      monthlyIncome: 8700,
      residentScore: 85,
      rentalHistoryScore: 90,
      rulesComplianceScore: 92,
      timelineScore: 88,
      communicationScore: 85,
      documentationScore: 90,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Nina Patel");
      expect(result.data.housingSupport).toBe("None"); // default
    }
  });

  it("rejects missing required fields", () => {
    const result = applicantSchema.safeParse({
      name: "Nina Patel",
      // email missing
      // phone missing
    });
    expect(result.success).toBe(false);
  });

  it("transforms email to lowercase", () => {
    const result = applicantSchema.safeParse({
      name: "Nina Patel",
      email: "NINA@EXAMPLE.COM",
      phone: "212-555-0141",
      monthlyRent: 2400,
      monthlyIncome: 8700,
      residentScore: 85,
      rentalHistoryScore: 90,
      rulesComplianceScore: 92,
      timelineScore: 88,
      communicationScore: 85,
      documentationScore: 90,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("nina@example.com");
    }
  });

  it("rejects more than 4 co-applicants", () => {
    const result = applicantSchema.safeParse({
      name: "Nina Patel",
      email: "nina@example.com",
      phone: "212-555-0141",
      monthlyRent: 2400,
      monthlyIncome: 8700,
      residentScore: 85,
      rentalHistoryScore: 90,
      rulesComplianceScore: 92,
      timelineScore: 88,
      communicationScore: 85,
      documentationScore: 90,
      coApplicants: [
        { name: "One" },
        { name: "Two" },
        { name: "Three" },
        { name: "Four" },
        { name: "Five" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts default values for optional fields", () => {
    const result = applicantSchema.safeParse({
      name: "Nina Patel",
      email: "nina@example.com",
      phone: "212-555-0141",
      monthlyRent: 2400,
      monthlyIncome: 8700,
      residentScore: 85,
      rentalHistoryScore: 90,
      rulesComplianceScore: 92,
      timelineScore: 88,
      communicationScore: 85,
      documentationScore: 90,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("New");
      expect(result.data.applicationSource).toBe("Email / Manual");
      expect(result.data.coApplicants).toEqual([]);
    }
  });
});
