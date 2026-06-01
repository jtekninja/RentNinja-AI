import { describe, expect, it } from "vitest";
import { serializeApplicantRecord } from "@/lib/applicant-serialization";

describe("serializeApplicantRecord", () => {
  it("recomputes zero affordability ratios from saved annual income and rent", () => {
    const applicant = serializeApplicantRecord({
      _id: "applicant-1",
      organizationId: "org-1",
      ownerId: "owner-1",
      createdAt: new Date("2026-01-01").toISOString(),
      updatedAt: new Date("2026-01-02").toISOString(),
      name: "Nina Patel",
      email: "nina@example.com",
      phone: "212-555-0100",
      monthlyRent: 2300,
      monthlyIncome: 180000,
      incomeAmount: 180000,
      incomeFrequency: "yearly",
      normalizedMonthlyIncome: 180000,
      incomeToRentRatio: 0,
      affordabilityRatio: 0,
      housingSupport: "None",
      monthlySubsidyAmount: 0,
      tenantPortionRent: 0,
      residentScore: 0,
      scores: {},
      notes: [],
    });

    expect(applicant.normalizedMonthlyIncome).toBe(15000);
    expect(applicant.incomeToRentRatio).toBeCloseTo(15000 / 2300);
    expect(applicant.affordabilityRatio).toBeCloseTo(15000 / 2300);
  });
});
