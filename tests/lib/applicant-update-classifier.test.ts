import { describe, expect, it } from "vitest";
import {
  calculateIncomeToRentRatio,
  classifyApplicantUpdateText,
} from "@/lib/applicant-update-classifier";
import { extractIncomeFromText } from "@/lib/income";

function field(
  updates: ReturnType<typeof classifyApplicantUpdateText>,
  name: string,
) {
  return updates.find((update) => update.field === name);
}

function note(
  updates: ReturnType<typeof classifyApplicantUpdateText>,
  label: string,
) {
  return updates.find(
    (update) => update.category === "AI Notes" && update.label === label,
  );
}

describe("classifyApplicantUpdateText", () => {
  it("treats rent and signing funds as landlord terms, not income", () => {
    const updates = classifyApplicantUpdateText(
      "2300 per month is rent and 4600 due at signing which includes security",
      {
        monthlyIncome: null,
        monthlyRent: null,
        incomeToRentRatio: null,
      },
    );

    expect(field(updates, "monthlyRent")?.numericValue).toBe(2300);
    expect(field(updates, "monthlyRent")?.category).toBe("Landlord Terms");
    expect(field(updates, "dueAtSigning")?.numericValue).toBe(4600);
    expect(field(updates, "monthlyIncome")).toBeUndefined();
    expect(field(updates, "incomeToRentRatio")).toBeUndefined();
    expect(
      updates.some((update) => update.newValue.includes("2300/month")),
    ).toBe(false);
    expect(
      updates.some((update) =>
        update.newValue.includes("Income-to-rent ratio not calculated"),
      ),
    ).toBe(true);
    expect(extractIncomeFromText("2300 per month is rent").amount).toBeNull();
  });

  it("recalculates ratio from existing saved income when only rent changes", () => {
    const updates = classifyApplicantUpdateText(
      "2300 per month is rent and 4600 due at signing which includes security",
      {
        monthlyIncome: 6900,
        monthlyRent: 7000,
        incomeToRentRatio: 0.99,
      },
    );

    expect(field(updates, "monthlyIncome")).toBeUndefined();
    expect(field(updates, "monthlyRent")?.numericValue).toBe(2300);
    expect(field(updates, "dueAtSigning")?.numericValue).toBe(4600);
    expect(field(updates, "incomeToRentRatio")?.numericValue).toBe(3);
    expect(note(updates, "Income-to-rent ratio")?.newValue).toContain(
      "Existing saved applicant income was preserved",
    );
    expect(note(updates, "Income-to-rent ratio")?.newValue).toContain(
      "Current saved income: $6,900/month",
    );
  });

  it("only says income is unavailable when no new or existing income exists", () => {
    const updates = classifyApplicantUpdateText("rent is 2300", {
      monthlyIncome: null,
      monthlyRent: null,
    });

    expect(field(updates, "incomeToRentRatio")).toBeUndefined();
    expect(note(updates, "Income-to-rent ratio")?.newValue).toBe(
      "Income-to-rent ratio not calculated — applicant income not available.",
    );
  });

  it("normalizes existing annual income before recalculating ratio", () => {
    const updates = classifyApplicantUpdateText("rent is 2300", {
      incomeAmount: 82800,
      incomeFrequency: "yearly",
      monthlyRent: 7000,
    });

    expect(field(updates, "monthlyIncome")).toBeUndefined();
    expect(field(updates, "monthlyRent")?.numericValue).toBe(2300);
    expect(field(updates, "incomeToRentRatio")?.numericValue).toBe(3);
  });

  it("recalculates ratio for rent and security updates without changing income", () => {
    const updates = classifyApplicantUpdateText(
      "rent is 2300 and security is 2300",
      {
        monthlyIncome: 5200,
        monthlyRent: 7000,
      },
    );

    expect(field(updates, "monthlyIncome")).toBeUndefined();
    expect(field(updates, "monthlyRent")?.numericValue).toBe(2300);
    expect(field(updates, "securityDeposit")?.numericValue).toBe(2300);
    expect(field(updates, "incomeToRentRatio")?.numericValue).toBeCloseTo(
      5200 / 2300,
      4,
    );
  });

  it("calculates ratio only when applicant income and rent are both explicit", () => {
    const updates = classifyApplicantUpdateText(
      "Applicant income is $6,900 per month and rent is $2,300",
    );

    expect(field(updates, "monthlyIncome")?.numericValue).toBe(6900);
    expect(field(updates, "monthlyRent")?.numericValue).toBe(2300);
    expect(field(updates, "incomeToRentRatio")?.numericValue).toBe(3);
  });

  it("does not treat a matching rent or security amount as income", () => {
    const updates = classifyApplicantUpdateText(
      "Rent is $2,300 and security is $2,300",
    );

    expect(field(updates, "monthlyRent")?.numericValue).toBe(2300);
    expect(field(updates, "securityDeposit")?.numericValue).toBe(2300);
    expect(field(updates, "monthlyIncome")).toBeUndefined();
    expect(field(updates, "incomeToRentRatio")).toBeUndefined();
  });

  it("keeps tenant portion separate from applicant income", () => {
    const updates = classifyApplicantUpdateText(
      "Tenant portion is $2,300 and voucher pays the rest",
    );

    expect(field(updates, "tenantPortionRent")?.numericValue).toBe(2300);
    expect(field(updates, "monthlyIncome")).toBeUndefined();
    expect(field(updates, "incomeToRentRatio")).toBeUndefined();
  });

  it("prefers valid new income and rent, then falls back to valid existing values", () => {
    expect(calculateIncomeToRentRatio(6900, null, 7000, 2300)).toBe(3);
    expect(calculateIncomeToRentRatio(null, null, 7000, 2300)).toBeNull();
    expect(calculateIncomeToRentRatio(5200, 9999999999999, 7000, 2300)).toBe(
      5200 / 2300,
    );
  });
});
