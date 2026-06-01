import { parseMoneyAmount } from "@/lib/income";

export type MoveInCostBreakdown = {
  securityDeposit: number | null;
  firstMonthRent: number | null;
  brokerFee: number | null;
  petFee: number | null;
  otherMoveInFees: number | null;
  dueAtSigningAmount: number | null;
  dueAtSigningRawText: string;
  dueAtSigningNeedsConfirmation: boolean;
};

const money = "\\$?\\s*([\\d,.]+(?:\\.\\d+)?)";

function positive(value: unknown, max = 250_000) {
  const numeric =
    typeof value === "string" ? (parseMoneyAmount(value) ?? Number.NaN) : Number(value);
  return Number.isFinite(numeric) && numeric > 0 && numeric <= max
    ? numeric
    : null;
}

function findMoneyNear(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return null;
  const amountGroup = [...match].slice(1).find((group) => group && /[\d,.]+/.test(group));
  return {
    amount: parseMoneyAmount(amountGroup ?? ""),
    rawText: match[0].trim(),
  };
}

export function extractMoveInCosts(
  sourceText: string,
  monthlyRent?: number | null,
): MoveInCostBreakdown {
  const text = sourceText.trim();
  const rent = positive(monthlyRent, 100_000);
  const directDue = findMoneyNear(
    text,
    new RegExp(
      `${money}\\s*(?:is\\s+)?(?:due at signing|due before move[- ]?in|move[- ]?in costs?|move[- ]?in funds?|upfront|amount due before move[- ]?in)`,
      "i",
    ),
  ) ?? findMoneyNear(
    text,
    new RegExp(
      `(?:due at signing|due before move[- ]?in|move[- ]?in costs?|move[- ]?in funds?|upfront|amount due before move[- ]?in)[^.\\n]{0,40}${money}`,
      "i",
    ),
  );
  const explicitSecurity = findMoneyNear(
    text,
    new RegExp(`(?:security(?: deposit)?|deposit)[^$\\d]{0,30}${money}`, "i"),
  ) ?? findMoneyNear(
    text,
    new RegExp(`${money}[^.\\n]{0,30}(?:security(?: deposit)?|deposit)`, "i"),
  );
  const explicitPetFee = findMoneyNear(
    text,
    new RegExp(`(?:pet fee|pet deposit)[^$\\d]{0,30}${money}`, "i"),
  );
  const explicitBrokerFee = findMoneyNear(
    text,
    new RegExp(`(?:broker fee|brokerage fee)[^$\\d]{0,30}${money}`, "i"),
  );
  const rentSecurityPair = text.match(
    new RegExp(`${money}[^.\\n]{0,20}(?:rent|first month)[^.\\n]{0,30}${money}[^.\\n]{0,20}(?:security|deposit)`, "i"),
  );
  const securityOneMonth =
    /security deposit equal to one month|one month(?:'s)? security|security(?: is)? one month|first month and security|first month rent and security/i.test(
      text,
    );
  const firstMonthMentioned =
    /first month(?:'s)?(?: rent)?|first month rent/i.test(text);

  const securityDeposit =
    positive(rentSecurityPair?.[2], 100_000) ??
    positive(explicitSecurity?.amount, 100_000) ??
    (securityOneMonth && rent ? rent : null);
  const firstMonthRent =
    positive(rentSecurityPair?.[1], 100_000) ?? (firstMonthMentioned && rent ? rent : null);
  const brokerFee = positive(explicitBrokerFee?.amount, 100_000);
  const petFee = positive(explicitPetFee?.amount, 25_000);
  const directAmount = positive(directDue?.amount, 250_000);
  const inferredTotal =
    [firstMonthRent, securityDeposit, brokerFee, petFee]
      .filter((value): value is number => Boolean(value && value > 0))
      .reduce((sum, value) => sum + value, 0) || null;

  return {
    securityDeposit,
    firstMonthRent,
    brokerFee,
    petFee,
    otherMoveInFees: null,
    dueAtSigningAmount: directAmount ?? inferredTotal,
    dueAtSigningRawText: directDue?.rawText || "",
    dueAtSigningNeedsConfirmation: Boolean(
      (directAmount && !inferredTotal) ||
        (!directAmount && !inferredTotal && /due at signing|move[- ]?in|upfront/i.test(text)),
    ),
  };
}

export function formatDueAtSigningBreakdown(costs: Partial<MoveInCostBreakdown>) {
  const parts = [
    costs.firstMonthRent ? `$${costs.firstMonthRent.toLocaleString()} first month` : "",
    costs.securityDeposit ? `$${costs.securityDeposit.toLocaleString()} security deposit` : "",
    costs.brokerFee ? `$${costs.brokerFee.toLocaleString()} broker fee` : "",
    costs.petFee ? `$${costs.petFee.toLocaleString()} pet fee` : "",
    costs.otherMoveInFees ? `$${costs.otherMoveInFees.toLocaleString()} other fees` : "",
  ].filter(Boolean);

  return parts.length ? parts.join(" + ") : "Needs confirmation";
}
