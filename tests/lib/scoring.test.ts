import { describe, it, expect } from "vitest";
import {
  calculateApplicantScore,
  normalizeResidentScore,
  calculateResponsibleRent,
  defaultScreeningPolicy,
} from "@/lib/scoring";
import type { ApplicantScoringInput } from "@/lib/scoring";

function strongApplicant(
  overrides: Partial<ApplicantScoringInput> = {},
): ApplicantScoringInput {
  return {
    monthlyRent: 2000,
    monthlyIncome: 8000,
    housingSupport: "None",
    supportProgram: "",
    monthlySubsidyAmount: 0,
    tenantPortionRent: 0,
    subsidyStatus: "N/A",
    inspectionStatus: "N/A",
    creditScore: 750,
    residentScore: 85,
    rentalHistoryScore: 90,
    rulesComplianceScore: 92,
    timelineScore: 88,
    communicationScore: 85,
    documentationScore: 90,
    ...overrides,
  };
}

describe("normalizeResidentScore", () => {
  it("returns 0 when score is 0 or negative", () => {
    expect(normalizeResidentScore(0)).toBe(0);
    expect(normalizeResidentScore(-1)).toBe(0);
  });

  it("preserves scores already in 0-100 range", () => {
    expect(normalizeResidentScore(50)).toBe(50);
    expect(normalizeResidentScore(100)).toBe(100);
  });

  it("normalizes 350-850 scores to 0-100 scale", () => {
    expect(normalizeResidentScore(350)).toBe(0);
    expect(normalizeResidentScore(600)).toBe(50);
    expect(normalizeResidentScore(850)).toBe(100);
  });

  it("treats values above 100 as 350-850 and normalizes them", () => {
    // Values > 100 are assumed to be on the 350-850 scale
    expect(normalizeResidentScore(200)).toBe(0); // 200 → bounded to 350 → (350-350)/500*100 = 0
    expect(normalizeResidentScore(500)).toBe(30); // (500-350)/500*100 = 30
  });
});

describe("calculateResponsibleRent", () => {
  it("returns monthly rent when no housing support", () => {
    expect(
      calculateResponsibleRent({
        monthlyRent: 2000,
        housingSupport: "None",
        monthlySubsidyAmount: 0,
        tenantPortionRent: 0,
      }),
    ).toBe(2000);
  });

  it("returns tenant portion when provided", () => {
    expect(
      calculateResponsibleRent({
        monthlyRent: 2000,
        housingSupport: "Voucher",
        monthlySubsidyAmount: 0,
        tenantPortionRent: 650,
      }),
    ).toBe(650);
  });

  it("calculates rent minus subsidy when no tenant portion", () => {
    expect(
      calculateResponsibleRent({
        monthlyRent: 2000,
        housingSupport: "Subsidy",
        monthlySubsidyAmount: 800,
        tenantPortionRent: 0,
      }),
    ).toBe(1200);
  });

  it("returns 0 when subsidy exceeds rent", () => {
    expect(
      calculateResponsibleRent({
        monthlyRent: 1000,
        housingSupport: "Subsidy",
        monthlySubsidyAmount: 1200,
        tenantPortionRent: 0,
      }),
    ).toBe(0);
  });
});

describe("calculateApplicantScore", () => {
  it("returns Strong for a high-income applicant with good scores", () => {
    const result = calculateApplicantScore(strongApplicant());
    expect(result.decision).toBe("Strong");
    expect(result.totalScore).toBeGreaterThanOrEqual(80);
  });

  it("returns Risk for very low income and scores", () => {
    const result = calculateApplicantScore(
      strongApplicant({
        monthlyIncome: 2000,
        monthlyRent: 2000,
        residentScore: 0,
        rentalHistoryScore: 0,
        rulesComplianceScore: 0,
        timelineScore: 0,
        communicationScore: 0,
        documentationScore: 0,
      }),
    );
    expect(result.decision).toBe("Risk");
    expect(result.totalScore).toBeLessThan(60);
    expect(result.redFlags.length).toBeGreaterThan(0);
  });

  it("returns Review for scores in the middle range", () => {
    // Affordability = 7000/2000 = 3.5 → income score = 100
    // Resident score = 50 (in 0-100, below minResidentScore 560 capped to 100)
    // Weighted: income(100*0.18) + resident(50*0.4) + rentalHistory(70*0.14) + etc.
    // Should land in 60-80 range
    const result = calculateApplicantScore(
      strongApplicant({
        monthlyIncome: 7000,
        monthlyRent: 2000,
        residentScore: 50,
        rentalHistoryScore: 70,
        rulesComplianceScore: 80,
        timelineScore: 70,
        communicationScore: 70,
        documentationScore: 80,
      }),
    );
    expect(result.decision).toBe("Review");
    expect(result.totalScore).toBeGreaterThanOrEqual(60);
    expect(result.totalScore).toBeLessThan(80);
  });

  it("calculates affordability ratio correctly", () => {
    const result = calculateApplicantScore(
      strongApplicant({ monthlyIncome: 5000, monthlyRent: 2000 }),
    );
    expect(result.affordabilityRatio).toBeCloseTo(2.5, 1);
  });

  it("generates red flags when affordability is below threshold", () => {
    const result = calculateApplicantScore(
      strongApplicant({ monthlyIncome: 3000, monthlyRent: 2000 }),
    );
    expect(result.affordabilityRatio).toBeLessThan(
      defaultScreeningPolicy.minAffordabilityRatio,
    );
    expect(
      result.redFlags.some((flag) => flag.toLowerCase().includes("income")),
    ).toBe(true);
  });

  it("averages resident scores across co-applicants", () => {
    const result = calculateApplicantScore(
      strongApplicant({
        residentScore: 80,
        coApplicants: [{ residentScore: 60 }],
      }),
    );
    expect(result.scores.resident).toBe(70);
  });

  it("handles voucher applicants without penalizing", () => {
    const result = calculateApplicantScore(
      strongApplicant({
        monthlyRent: 2000,
        monthlyIncome: 3000,
        housingSupport: "Voucher",
        subsidyStatus: "Verified",
        inspectionStatus: "Passed",
        monthlySubsidyAmount: 1350,
        tenantPortionRent: 650,
      }),
    );
    // Affordability based on tenant-paid portion (650), not full rent
    expect(result.affordabilityRatio).toBeCloseTo(3000 / 650, 1);
  });

  it("uses custom screening policy thresholds", () => {
    const customPolicy = { strongScoreThreshold: 90, reviewScoreThreshold: 70 };
    const result = calculateApplicantScore(
      strongApplicant({ monthlyIncome: 4000, monthlyRent: 2000 }),
      customPolicy,
    );
    // With default policy this would be Strong. With custom 90 threshold,
    // the same score should be Review.
    expect(result.decision).toBe("Review");
  });

  it("returns a score even when no sub-scores are provided", () => {
    const result = calculateApplicantScore(
      strongApplicant({
        residentScore: 0,
        rentalHistoryScore: 0,
        rulesComplianceScore: 0,
        timelineScore: 0,
        communicationScore: 0,
        documentationScore: 0,
      }),
    );
    // Income score alone (from affordability ratio) should give a score
    expect(result.totalScore).toBeGreaterThan(0);
  });

  it("flags missing documentation", () => {
    const result = calculateApplicantScore(
      strongApplicant({ documentationScore: 30 }),
    );
    expect(
      result.redFlags.some((flag) =>
        flag.toLowerCase().includes("documentation"),
      ),
    ).toBe(true);
  });

  it("flags low resident score against policy threshold", () => {
    // residentScore: 30 is below minResidentScore 560 (capped to 100)
    const result = calculateApplicantScore(
      strongApplicant({ residentScore: 30 }),
    );
    expect(
      result.redFlags.some((flag) =>
        flag.toLowerCase().includes("score is below"),
      ),
    ).toBe(true);
  });
});
