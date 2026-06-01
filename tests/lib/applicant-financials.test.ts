import { normalizeApplicantFinancials } from "@/lib/applicant-financials";

describe("normalizeApplicantFinancials", () => {
  it("uses property rent instead of misclassified gross monthly income", () => {
    const financials = normalizeApplicantFinancials(
      {
        monthlyRent: 7000,
        monthlyIncome: 8333,
        rawText: "Applicant reported gross monthly income $7,000.",
      },
      { propertyMonthlyRent: 2300, securityDepositMonths: 1, requireFirstMonthAtSigning: true },
    );

    expect(financials.monthlyRent).toBe(2300);
    expect(financials.normalizedMonthlyIncome).toBe(7000);
    expect(financials.incomeToRentRatio).toBeCloseTo(3.04, 2);
    expect(financials.dueAtSigningAmount).toBe(4600);
    expect(financials.financialFieldsCorrected).toBe(true);
  });

  it("normalizes annual income against property rent", () => {
    const financials = normalizeApplicantFinancials(
      {
        incomeAmount: 100000,
        incomeFrequency: "yearly",
        monthlyRent: 100000,
      },
      { propertyMonthlyRent: 2300, securityDepositMonths: 1, requireFirstMonthAtSigning: true },
    );

    expect(financials.normalizedMonthlyIncome).toBeCloseTo(8333.33, 2);
    expect(financials.incomeToRentRatio).toBeCloseTo(3.62, 2);
    expect(financials.dueAtSigningAmount).toBe(4600);
  });

  it("does not use tenant portion as full rent without property rent", () => {
    const financials = normalizeApplicantFinancials({
      monthlyRent: 0,
      tenantPortionRent: 2300,
      rawText: "Tenant portion is $2,300 and voucher pays the rest",
    });

    expect(financials.monthlyRent).toBe(0);
    expect(financials.tenantPortion).toBe(2300);
    expect(financials.incomeToRentRatio).toBeNull();
  });

  it("leaves unknown rent and due at signing as needs confirmation", () => {
    const financials = normalizeApplicantFinancials({
      rawText: "Applicant has not provided rent or property context.",
      incomeAmount: 7000,
      incomeFrequency: "monthly",
    });

    expect(financials.monthlyRent).toBe(0);
    expect(financials.incomeToRentRatio).toBeNull();
    expect(financials.dueAtSigningAmount).toBe(0);
    expect(financials.dueAtSigningNeedsConfirmation).toBe(true);
  });
});
