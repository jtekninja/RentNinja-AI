import { describe, expect, it } from "vitest";
import { mergeApplicantUpdate } from "@/lib/applicant-update-merge";

function makeApplicant(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Applicant",
    email: "test@example.com",
    phone: "555-555-5555",
    monthlyIncome: 0,
    monthlyRent: 0,
    incomeAmount: null,
    incomeFrequency: "unknown" as const,
    normalizedMonthlyIncome: null,
    incomeToRentRatio: null,
    dueAtSigning: 0,
    securityDeposit: 0,
    creditScore: 0,
    missingDocuments: [],
    receivedDocuments: [],
    status: "New",
    updateHistory: [],
    ...overrides,
  };
}

describe("mergeApplicantUpdate", () => {
  it("preserves existing income and recalculates ratio for landlord rent terms", () => {
    const merge = mergeApplicantUpdate(
      makeApplicant({
        monthlyIncome: 6900,
        normalizedMonthlyIncome: 6900,
        monthlyRent: 7000,
        incomeToRentRatio: 0.99,
      }),
      "2300 per month is rent and 4600 due at signing which includes security",
    );

    expect(merge.mergedApplicant.monthlyIncome).toBe(6900);
    expect(merge.mergedApplicant.monthlyRent).toBe(2300);
    expect(merge.mergedApplicant.dueAtSigning).toBe(4600);
    expect(merge.mergedApplicant.incomeToRentRatio).toBe(3);
    expect(
      merge.reviewRows.some((row) =>
        row.reason.includes("No new income provided"),
      ),
    ).toBe(true);
    expect(
      merge.reviewRows.some((row) =>
        row.finalValue.includes("income not provided"),
      ),
    ).toBe(false);
  });

  it("marks ID received and removes it from missing docs without touching rent or income", () => {
    const merge = mergeApplicantUpdate(
      makeApplicant({
        monthlyIncome: 6900,
        normalizedMonthlyIncome: 6900,
        monthlyRent: 2300,
        incomeToRentRatio: 3,
        missingDocuments: ["bank statements", "ID"],
      }),
      "Applicant sent ID",
    );

    expect(merge.mergedApplicant.monthlyIncome).toBe(6900);
    expect(merge.mergedApplicant.monthlyRent).toBe(2300);
    expect(merge.mergedApplicant.incomeToRentRatio).toBe(3);
    expect(merge.mergedApplicant.receivedDocuments).toContain("ID");
    expect(merge.mergedApplicant.missingDocuments).toEqual(["bank statements"]);
  });

  it("updates credit score without erasing existing income", () => {
    const merge = mergeApplicantUpdate(
      makeApplicant({
        creditScore: 710,
        monthlyIncome: 6900,
        normalizedMonthlyIncome: 6900,
      }),
      "Credit score is actually 650",
    );

    expect(merge.mergedApplicant.creditScore).toBe(650);
    expect(merge.mergedApplicant.monthlyIncome).toBe(6900);
  });

  it("keeps status when rent and security update only", () => {
    const merge = mergeApplicantUpdate(
      makeApplicant({
        status: "Ready for Review",
        monthlyIncome: 5200,
        normalizedMonthlyIncome: 5200,
        monthlyRent: 7000,
      }),
      "Rent is 2300 and security is 2300",
    );

    expect(merge.mergedApplicant.status).toBe("Ready for Review");
    expect(merge.mergedApplicant.monthlyRent).toBe(2300);
    expect(merge.mergedApplicant.securityDeposit).toBe(2300);
    expect(merge.mergedApplicant.incomeToRentRatio).toBeCloseTo(5200 / 2300);
  });

  it("keeps ratio null when income is unavailable", () => {
    const merge = mergeApplicantUpdate(
      makeApplicant({
        monthlyIncome: 0,
        normalizedMonthlyIncome: null,
        monthlyRent: 2300,
      }),
      "4600 due at signing",
    );

    expect(merge.mergedApplicant.monthlyIncome).toBe(0);
    expect(merge.mergedApplicant.incomeToRentRatio).toBeNull();
    expect(
      merge.reviewRows.some((row) =>
        row.reason.includes("applicant income not available"),
      ),
    ).toBe(true);
  });
});
