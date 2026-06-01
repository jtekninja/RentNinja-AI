import { extractMoveInCosts, formatDueAtSigningBreakdown } from "@/lib/move-in-costs";

describe("move-in cost extraction", () => {
  it("extracts a directly stated due-at-signing amount", () => {
    const costs = extractMoveInCosts("$4,600 due at signing", 2300);

    expect(costs.dueAtSigningAmount).toBe(4600);
    expect(costs.dueAtSigningRawText).toContain("$4,600 due at signing");
    expect(costs.dueAtSigningNeedsConfirmation).toBe(true);
  });

  it("infers first month plus one month security from rent", () => {
    const costs = extractMoveInCosts("First month and security are due before move-in.", 2300);

    expect(costs.firstMonthRent).toBe(2300);
    expect(costs.securityDeposit).toBe(2300);
    expect(costs.dueAtSigningAmount).toBe(4600);
    expect(formatDueAtSigningBreakdown(costs)).toBe(
      "$2,300 first month + $2,300 security deposit",
    );
  });

  it("extracts rent plus security pair without treating either value as income", () => {
    const costs = extractMoveInCosts("$2,300 rent + $2,300 security", 2300);

    expect(costs.firstMonthRent).toBe(2300);
    expect(costs.securityDeposit).toBe(2300);
    expect(costs.dueAtSigningAmount).toBe(4600);
  });

  it("extracts upfront move-in cost totals", () => {
    const costs = extractMoveInCosts("$1,200 upfront", null);

    expect(costs.dueAtSigningAmount).toBe(1200);
    expect(costs.dueAtSigningNeedsConfirmation).toBe(true);
    expect(formatDueAtSigningBreakdown(costs)).toBe("Needs confirmation");
  });
});
