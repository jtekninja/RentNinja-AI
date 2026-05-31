export type IncomeFrequency =
  | "hourly"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly"
  | "unknown";

export type NormalizedIncome = {
  amount: number | null;
  frequency: IncomeFrequency;
  hoursPerWeek?: number;
  rawText: string;
  normalizedMonthly: number | null;
  warning?: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const frequencyLabels: Record<IncomeFrequency, string> = {
  hourly: "/hour",
  weekly: "/week",
  biweekly: "/biweekly",
  monthly: "/month",
  yearly: "/year",
  unknown: "",
};

export function finiteNumber(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function parseMoneyAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const match = text.replace(/,/g, "").match(/-?\$?\s*(\d+(?:\.\d+)?)\s*(k)?/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return match[2] ? amount * 1000 : amount;
}

export function parseRentToMonthly(value: unknown): number | null {
  const amount = parseMoneyAmount(value);
  return amount !== null && amount > 0 ? amount : null;
}

export function detectIncomeFrequency(value: unknown): IncomeFrequency {
  const text = String(value ?? "").toLowerCase();

  if (/\b(year|annual|annually|yr|salary)\b|\/year|\/yr/.test(text)) return "yearly";
  if (/\b(biweekly|bi-weekly|every\s*2\s*weeks)\b/.test(text)) return "biweekly";
  if (/\b(week|weekly|wk)\b|\/week|\/wk/.test(text)) return "weekly";
  if (/\b(hour|hourly|hr)\b|\/hour|\/hr/.test(text)) return "hourly";
  if (/\b(month|monthly|mo)\b|\/month|\/mo/.test(text)) return "monthly";

  return "unknown";
}

export function normalizeIncomeToMonthly(input: {
  amount: number | null;
  frequency: IncomeFrequency;
  hoursPerWeek?: number | null;
}): number | null {
  const amount = finiteNumber(input.amount);
  if (amount === null || amount <= 0) {
    return null;
  }

  switch (input.frequency) {
    case "yearly":
      return amount / 12;
    case "monthly":
      return amount;
    case "weekly":
      return (amount * 52) / 12;
    case "biweekly":
      return (amount * 26) / 12;
    case "hourly": {
      const hours = finiteNumber(input.hoursPerWeek) ?? 40;
      return (amount * hours * 52) / 12;
    }
    case "unknown":
    default:
      return null;
  }
}

export function calculateIncomeToRentRatio(
  monthlyIncome: number | null,
  monthlyRent: number | null,
): number | null {
  if (
    monthlyIncome === null ||
    monthlyRent === null ||
    !Number.isFinite(monthlyIncome) ||
    !Number.isFinite(monthlyRent) ||
    monthlyIncome <= 0 ||
    monthlyRent <= 0
  ) {
    return null;
  }

  return monthlyIncome / monthlyRent;
}

export function formatRentMonthly(monthlyRent: number | null): string {
  return monthlyRent !== null && monthlyRent > 0
    ? `${currency.format(monthlyRent)}/month`
    : "Needs confirmation";
}

export function formatRentDisplay(monthlyRent: number | null): string {
  return formatRentMonthly(monthlyRent);
}

export function formatRatioDisplay(ratio: number | null): string {
  return ratio !== null && Number.isFinite(ratio)
    ? `${ratio.toFixed(1)}x rent`
    : "Needs confirmation";
}

export function formatIncomeDisplay(income: NormalizedIncome): string {
  if (income.amount === null || income.amount <= 0) {
    return "Needs confirmation";
  }

  const label = frequencyLabels[income.frequency];

  if (income.frequency === "unknown") {
    return `${currency.format(income.amount)} (frequency unknown)`;
  }

  let display = `${currency.format(income.amount)}${label}`;

  if (income.normalizedMonthly !== null) {
    display += ` (~${currency.format(income.normalizedMonthly)}/month)`;
  }

  if (income.frequency === "hourly" && income.hoursPerWeek) {
    display += ` · ${income.hoursPerWeek}h/week`;
  }

  return display;
}

export function formatAffordabilityDisplay(
  normalizedMonthlyIncome: number | null,
  monthlyRent: number | null,
): string {
  const ratio = calculateIncomeToRentRatio(normalizedMonthlyIncome, monthlyRent);
  return formatRatioDisplay(ratio);
}

export function getAffordabilityWarning(income: NormalizedIncome): string | null {
  if (income.amount && income.frequency === "unknown") {
    return "Income amount found, but frequency is unclear. Confirm yearly/monthly/hourly before relying on affordability score.";
  }

  return null;
}

export function extractIncomeFromText(text: string): {
  rawText: string;
  amount: number | null;
  frequency: IncomeFrequency;
  hoursPerWeek?: number;
} {
  const patterns: Array<{ pattern: RegExp; frequency: IncomeFrequency }> = [
    { pattern: /\$?\s*([\d,.]+(?:\.\d+)?)\s*k?\s*(?:per\s*)?(?:year|annual|annually|yr)\b/i, frequency: "yearly" },
    { pattern: /\b(?:income|makes?|earns?|salary)[^$\d]{0,40}\$?\s*([\d,.]+(?:\.\d+)?)\s*k?\s*(?:per\s*)?(?:year|annual|annually|yr)?\b/i, frequency: "yearly" },
    { pattern: /\$?\s*([\d,.]+(?:\.\d+)?)\s*(?:per\s*)?(?:month|monthly|\/mo|\/month)\b/i, frequency: "monthly" },
    { pattern: /\$?\s*([\d,.]+(?:\.\d+)?)\s*(?:per\s*)?(?:biweekly|bi-weekly|every\s*2\s*weeks)\b/i, frequency: "biweekly" },
    { pattern: /\$?\s*([\d,.]+(?:\.\d+)?)\s*(?:per\s*)?(?:week|weekly|\/wk|\/week)\b/i, frequency: "weekly" },
    { pattern: /\$?\s*([\d,.]+(?:\.\d+)?)\s*(?:\/|per\s*)?(?:hour|hr)\b/i, frequency: "hourly" },
    { pattern: /\b(?:income|makes?|earns?|salary)[^$\d]{0,40}\$?\s*([\d,.]+(?:\.\d+)?)/i, frequency: "unknown" },
  ];

  for (const item of patterns) {
    const match = text.match(item.pattern);
    if (!match) continue;

    const amount = parseMoneyAmount(match[0]);
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|h)\s*(?:per\s*)?(?:week|wk)/i);
    const hoursPerWeek = hoursMatch ? Number(hoursMatch[1]) : undefined;

    return {
      rawText: match[0].trim(),
      amount,
      frequency: item.frequency,
      hoursPerWeek: Number.isFinite(hoursPerWeek) ? hoursPerWeek : undefined,
    };
  }

  return { rawText: "", amount: null, frequency: "unknown" };
}

export function extractRentFromText(text: string): {
  rawText: string;
  amount: number | null;
} {
  const patterns = [
    /\brent(?:\s+is|:)?\s*\$?\s*([\d,.]+(?:\.\d+)?)(?:\s*(?:per\s*)?(?:month|monthly|\/mo|\/month))?/i,
    /\$?\s*([\d,.]+(?:\.\d+)?)\s*(?:per\s*)?(?:month|monthly|\/mo|\/month)\b/i,
    /\bmonthly\s+rent:?\s*\$?\s*([\d,.]+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    return {
      rawText: match[0].trim(),
      amount: parseRentToMonthly(match[0]),
    };
  }

  return { rawText: "", amount: null };
}

export function normalizeAffordabilityFromText(params: {
  incomeText: string;
  rentText: string;
  fallbackText?: string;
}): {
  incomeAmount: number | null;
  incomeFrequency: IncomeFrequency;
  normalizedMonthlyIncome: number | null;
  monthlyRent: number | null;
  incomeToRentRatio: number | null;
  incomeDisplay: string;
  rentDisplay: string;
  affordabilityDisplay: string;
  warning: string | null;
} {
  const fullText = [params.incomeText, params.rentText, params.fallbackText]
    .filter(Boolean)
    .join("\n");
  const extractedIncome = extractIncomeFromText(fullText);
  const incomeAmount = extractedIncome.amount ?? parseMoneyAmount(params.incomeText);
  const incomeFrequency =
    extractedIncome.frequency !== "unknown"
      ? extractedIncome.frequency
      : detectIncomeFrequency(params.incomeText);
  const normalizedMonthlyIncome = normalizeIncomeToMonthly({
    amount: incomeAmount,
    frequency: incomeFrequency,
    hoursPerWeek: extractedIncome.hoursPerWeek,
  });
  const extractedRent = extractRentFromText(fullText);
  const monthlyRent = extractedRent.amount ?? parseRentToMonthly(params.rentText);
  const incomeToRentRatio = calculateIncomeToRentRatio(
    normalizedMonthlyIncome,
    monthlyRent,
  );
  const income: NormalizedIncome = {
    amount: incomeAmount,
    frequency: incomeFrequency,
    hoursPerWeek: extractedIncome.hoursPerWeek,
    rawText: params.incomeText,
    normalizedMonthly: normalizedMonthlyIncome,
  };
  const warning = getAffordabilityWarning(income);

  return {
    incomeAmount,
    incomeFrequency,
    normalizedMonthlyIncome,
    monthlyRent,
    incomeToRentRatio,
    incomeDisplay: formatIncomeDisplay(income),
    rentDisplay: formatRentMonthly(monthlyRent),
    affordabilityDisplay: formatAffordabilityDisplay(
      normalizedMonthlyIncome,
      monthlyRent,
    ),
    warning,
  };
}
