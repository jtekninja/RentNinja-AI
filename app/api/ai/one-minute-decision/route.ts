import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStructuredOpenAIResponse, hasOpenAIConfig } from "@/lib/openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  extractIncomeFromText,
  extractRentFromText,
  parseMoneyAmount,
  parseRentToMonthly,
  detectIncomeFrequency,
  normalizeIncomeToMonthly,
  formatIncomeDisplay,
  formatAffordabilityDisplay,
  formatRentDisplay,
  getAffordabilityWarning,
  type IncomeFrequency,
  type NormalizedIncome,
} from "@/lib/income";
import { extractMoveInCosts } from "@/lib/move-in-costs";

const ONE_MINUTE_LIMIT = {
  limit: 20,
  windowMs: 60_000,
  label: "one-minute-decision",
};

export type DecisionResult = {
  applicantName: string;
  phone: string;
  email: string;
  moveInDate: string;
  monthlyRent: string;
  monthlyRentAmount: number;
  householdIncome: string;
  householdIncomeDisplay: string;
  incomeAmount: number;
  incomeFrequency: IncomeFrequency;
  incomeHoursPerWeek?: number;
  normalizedMonthlyIncome: number | null;
  affordabilityDisplay: string;
  incomeWarning?: string | null;
  employmentInfo: string;
  voucherInfo: string;
  tenantPortion: string;
  occupants: string;
  petsSmoking: string;
  documentsMentioned: string[];
  missingDocuments: string[];
  redFlagsOrConcerns: string[];
  followUpQuestions: string[];
  suggestedStatus: string;
  ninjaDecisionScore: number;
  readiness: number;
  riskLevel: "Low" | "Medium" | "High";
  confidenceLevel: "Low" | "Medium" | "High";
  confidenceReason: string;
  mainStrength: string;
  mainConcern: string;
  bestNextStep: string;
  suggestedMessage: string;
  demoMode: boolean;
};

type PropertyContext = {
  propertyId?: string;
  propertyAddress?: string;
  propertyUnit?: string;
  propertyNickname?: string;
  borough?: string;
  neighborhood?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  monthlyRent?: number | null;
  securityDepositMonths?: number | null;
  requireFirstMonthAtSigning?: boolean | null;
  utilitiesIncluded?: boolean;
};

function matchFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function clampPercent(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
}

function clampScore(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
}

function getPropertyRent(propertyContext?: PropertyContext) {
  const rent = Number(propertyContext?.monthlyRent ?? 0);
  return Number.isFinite(rent) && rent > 0 ? rent : null;
}

function mockDecision(input: string, propertyContext?: PropertyContext): DecisionResult {
  const lower = input.toLowerCase();
  const email = matchFirst(input, [/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i]);
  const phone = matchFirst(input, [/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/]);

  // ── Income extraction with frequency ──
  const extractedIncome = extractIncomeFromText(input);
  const normalizedMonthly = normalizeIncomeToMonthly({
    amount: extractedIncome.amount,
    frequency: extractedIncome.frequency,
    hoursPerWeek: extractedIncome.hoursPerWeek,
  });

  const incomeData: NormalizedIncome = {
    amount: extractedIncome.amount,
    frequency: extractedIncome.frequency,
    hoursPerWeek: extractedIncome.hoursPerWeek,
    rawText: extractedIncome.rawText,
    normalizedMonthly,
    warning:
      getAffordabilityWarning({
        amount: extractedIncome.amount,
        frequency: extractedIncome.frequency,
        rawText: extractedIncome.rawText,
        normalizedMonthly,
      }) ?? undefined,
  };

  // ── Rent extraction ──
  const extractedRent = extractRentFromText(input);
  const propertyRent = getPropertyRent(propertyContext);
  const monthlyRentAmount = propertyRent ?? extractedRent.amount ?? null;
  const moveInCosts = extractMoveInCosts(input, monthlyRentAmount);
  const proofOfFundsDoc = moveInCosts.dueAtSigningAmount
    ? `Proof of funds for $${moveInCosts.dueAtSigningAmount.toLocaleString()} due at signing`
    : "Proof of funds for move-in costs";

  // ── Affordability ──
  const affordabilityDisplay = formatAffordabilityDisplay(
    normalizedMonthly,
    monthlyRentAmount,
  );

  // ── Name ──
  const name = matchFirst(input, [
    /name(?: is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
    /applicant(?: is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
  ]);

  const hasVoucher =
    /voucher|section 8|subsidy|case worker|shopping letter/i.test(input);
  const docs = [
    lower.includes("id") ? "Government ID" : "",
    lower.includes("paystub") || lower.includes("proof of income")
      ? "Proof of income"
      : "",
    lower.includes("bank") ? "Bank statements" : "",
    lower.includes("landlord") ? "Landlord reference" : "",
    hasVoucher ? "Voucher note" : "",
  ].filter(Boolean);
  const missing = [
    docs.includes("Government ID") ? "" : "Government ID",
    docs.includes("Proof of income") ? "" : "Proof of income",
    docs.includes("Bank statements") ? "" : "Bank statements",
    docs.includes("Landlord reference") ? "" : "Landlord reference",
    hasVoucher && !lower.includes("shopping letter")
      ? "Voucher shopping letter"
      : "",
    /proof of funds|bank statements?/i.test(lower)
      ? ""
      : proofOfFundsDoc,
  ].filter(Boolean);

  // ── Scoring ──
  let readiness = Math.max(35, 100 - missing.length * 12);
  let score = Math.max(58, Math.min(91, readiness - (hasVoucher ? 2 : 0)));

  // Use normalized income for scoring
  if (normalizedMonthly !== null && monthlyRentAmount !== null && monthlyRentAmount > 0) {
    const ratio = normalizedMonthly / monthlyRentAmount;
    if (ratio >= 3) {
      score += 6;
      readiness += 5;
    } else if (ratio >= 2.5) {
      score += 3;
      readiness += 2;
    } else if (ratio >= 2) {
      /* neutral */
    } else if (ratio >= 1.5) {
      score -= 2;
      readiness -= 1;
    } else if (ratio > 0) {
      score -= 5;
      readiness -= 3;
    }
  }
  score = Math.max(50, Math.min(95, score));
  readiness = Math.max(30, Math.min(98, readiness));

  const riskLevel = score >= 78 ? "Low" : score >= 64 ? "Medium" : "High";

  // Main strength based on actual affordability
  let mainStrength = "Income information was included in the pasted packet.";
  if (normalizedMonthly !== null && monthlyRentAmount !== null && monthlyRentAmount > 0) {
    const ratio = normalizedMonthly / monthlyRentAmount;
    if (ratio >= 3)
      mainStrength = `Strong affordability at ${ratio.toFixed(1)}x rent.`;
    else if (ratio >= 2)
      mainStrength = `Adequate income-to-rent ratio at ${ratio.toFixed(1)}x.`;
    else if (ratio > 0)
      mainStrength = `Income-to-rent ratio is ${ratio.toFixed(1)}x — needs review.`;
  } else if (extractedIncome.amount !== null && extractedIncome.amount > 0) {
    mainStrength =
      "Income amount found but frequency needs confirmation for affordability scoring.";
  }

  return {
    applicantName: name || "Applicant from pasted info",
    phone,
    email,
    moveInDate: matchFirst(input, [
      /move[- ]?in(?: date)?(?: is|:)?\s*([A-Za-z0-9, /-]+)/i,
    ]),
    monthlyRent: formatRentDisplay(monthlyRentAmount),
    monthlyRentAmount: monthlyRentAmount ?? 0,
    householdIncome:
      extractedIncome.amount !== null && extractedIncome.amount > 0
        ? `$${extractedIncome.amount.toLocaleString()}`
        : "Not found",
    householdIncomeDisplay:
      extractedIncome.amount !== null && extractedIncome.amount > 0
        ? formatIncomeDisplay(incomeData)
        : "Not found",
    incomeAmount: extractedIncome.amount ?? 0,
    incomeFrequency: extractedIncome.frequency,
    incomeHoursPerWeek: extractedIncome.hoursPerWeek,
    normalizedMonthlyIncome: normalizedMonthly,
    affordabilityDisplay,
    incomeWarning: incomeData.warning ?? null,
    employmentInfo:
      matchFirst(input, [/work(?:s|ing)?(?: at| for)?\s*([^.\n]+)/i]) ||
      "Not clearly stated",
    voucherInfo: hasVoucher
      ? "Voucher/subsidy mentioned. Verify process documents only."
      : "No voucher/subsidy mentioned",
    tenantPortion:
      matchFirst(input, [/tenant portion(?: is|:)?\s*\$?([\d,]+)/i]) ||
      "Not found",
    occupants:
      matchFirst(input, [/occupants?(?: is|:)?\s*([^.\n]+)/i]) || "Not found",
    petsSmoking:
      matchFirst(input, [/(?:pets?|smoking)(?: is|:)?\s*([^.\n]+)/i]) ||
      "Not found",
    documentsMentioned: docs.length ? docs : ["Application text pasted"],
    missingDocuments: missing,
    redFlagsOrConcerns: missing.length
      ? ["File is not ready until missing documents are collected."]
      : ["No major process concern detected from the pasted information."],
    followUpQuestions: missing
      .slice(0, 3)
      .map((item) => `Can you send ${item.toLowerCase()}?`),
    suggestedStatus: missing.length ? "Missing Documents" : "Ready for Review",
    ninjaDecisionScore: score,
    readiness,
    riskLevel,
    confidenceLevel:
      input.length > 350 ? "High" : input.length > 120 ? "Medium" : "Low",
    confidenceReason:
      propertyContext?.propertyAddress
        ? `Review includes property context for ${propertyContext.propertyAddress}.`
        : input.length > 350
        ? "The pasted info includes enough detail for a higher-confidence draft review."
        : input.length > 120
          ? "Some core details were found, but missing documents and unclear fields still need follow-up."
          : "The pasted info is brief, so the AI review should be treated as a low-confidence draft.",
    mainStrength,
    mainConcern:
      missing[0] ||
      "Confirm all required documents against your screening checklist.",
    bestNextStep: missing.length
      ? `Request ${missing.slice(0, 2).join(" and ")}.`
      : "Prepare an owner report or compare this applicant with other ready candidates.",
    suggestedMessage: `Hi ${name || "there"}, thanks for your interest. To keep your application moving, please send ${missing.slice(0, 3).join(", ") || "any remaining documents requested in the application checklist"}. Thank you.`,
    demoMode: true,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rlResult = checkRateLimit(request, ONE_MINUTE_LIMIT, session.user.id);
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  const body = await request.json().catch(() => ({}));
  const input = String(body?.input || "").trim();
  const propertyContext = (body?.propertyContext || {}) as PropertyContext;
  if (!input) {
    return NextResponse.json(
      { message: "Paste applicant info first." },
      { status: 400 },
    );
  }

  if (!hasOpenAIConfig()) {
    return NextResponse.json(mockDecision(input, propertyContext));
  }

  // AI path: use OpenAI but normalize income deterministically after
  const aiResult = await createStructuredOpenAIResponse<{
    applicantName: string;
    phone: string;
    email: string;
    moveInDate: string;
    monthlyRent: string;
    householdIncome: string;
    employmentInfo: string;
    voucherInfo: string;
    tenantPortion: string;
    occupants: string;
    petsSmoking: string;
    documentsMentioned: string[];
    missingDocuments: string[];
    redFlagsOrConcerns: string[];
    followUpQuestions: string[];
    suggestedStatus: string;
    ninjaDecisionScore: number;
    readiness: number;
    riskLevel: "Low" | "Medium" | "High";
    confidenceLevel: "Low" | "Medium" | "High";
    confidenceReason: string;
    mainStrength: string;
    mainConcern: string;
    bestNextStep: string;
    suggestedMessage: string;
  }>({
    schemaName: "one_minute_applicant_decision",
    schemaDescription:
      "Clean applicant decision card and messy-info extraction. IMPORTANT: Preserve the income frequency (yearly/monthly/weekly/hourly) in the householdIncome field as raw text. Return concise screening facts only, not copied source text.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "applicantName",
        "phone",
        "email",
        "moveInDate",
        "monthlyRent",
        "householdIncome",
        "employmentInfo",
        "voucherInfo",
        "tenantPortion",
        "occupants",
        "petsSmoking",
        "documentsMentioned",
        "missingDocuments",
        "redFlagsOrConcerns",
        "followUpQuestions",
        "suggestedStatus",
        "ninjaDecisionScore",
        "readiness",
        "riskLevel",
        "confidenceLevel",
        "confidenceReason",
        "mainStrength",
        "mainConcern",
        "bestNextStep",
        "suggestedMessage",
      ],
      properties: {
        applicantName: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        moveInDate: { type: "string" },
        monthlyRent: {
          type: "string",
          description: "Monthly rent as raw text, e.g. '$2,300/month'",
        },
        householdIncome: {
          type: "string",
          description:
            "Household income as raw text WITH frequency, e.g. '$180,000/year', '$8,000/month', '$22/hour at 40h/week'. Always preserve the unit.",
        },
        employmentInfo: { type: "string" },
        voucherInfo: { type: "string" },
        tenantPortion: { type: "string" },
        occupants: { type: "string" },
        petsSmoking: { type: "string" },
        documentsMentioned: { type: "array", items: { type: "string" } },
        missingDocuments: { type: "array", items: { type: "string" } },
        redFlagsOrConcerns: { type: "array", items: { type: "string" } },
        followUpQuestions: { type: "array", items: { type: "string" } },
        suggestedStatus: { type: "string" },
        ninjaDecisionScore: { type: "number" },
        readiness: { type: "number" },
        riskLevel: { type: "string", enum: ["Low", "Medium", "High"] },
        confidenceLevel: { type: "string", enum: ["Low", "Medium", "High"] },
        confidenceReason: { type: "string" },
        mainStrength: { type: "string" },
        mainConcern: { type: "string" },
        bestNextStep: { type: "string" },
        suggestedMessage: { type: "string" },
      },
    },
    input: [
      {
        role: "system",
        content:
          "You are RentNinja AI. Extract messy rental applicant info into concise owner-friendly screening facts only. IMPORTANT: Always preserve income frequency (yearly, monthly, weekly, hourly) in householdIncome. Treat phrases like 'gross monthly income $7,000' as applicant income, not rent. Treat only 'rent', 'listing rent', 'unit rent', 'monthly rent for the apartment', or landlord-provided rent as rent. If selected property context includes monthlyRent, do not overwrite it with applicant income. If multiple dollar amounts exist, classify each by label/context and return confidence/source in the concise explanation. Write income as raw text like '$180,000/year' not just '$180,000'. Ignore duplicate lines, repeated uploaded-file placeholder text, browser/system noise, formatting junk, irrelevant job history details unless tied to income or stability, and unnecessary long explanations. Focus on applicant name, phone/email, income amount/frequency, employment, rent or tenant portion, move-in date, occupants, pets, smoking, voucher/subsidy, credit score, bankruptcy, eviction or housing court info, background check concerns, landlord references, documents received/missing, screening status, next step, strengths, and concerns. Use objective rental criteria only. Do not analyze or recommend based on protected classes.",
      },
      {
        role: "user",
        content: [
          propertyContext?.propertyAddress
            ? `Selected rental property context:\n${JSON.stringify(propertyContext, null, 2)}`
            : "No property selected. Rent and location-specific screening may be incomplete.",
          `Applicant source material:\n${input}`,
        ].join("\n\n"),
      },
    ],
  });

  // ── Post-process AI result with deterministic income normalization ──
  const extractedIncome = extractIncomeFromText(input);
  const fallbackIncomeAmount = parseMoneyAmount(aiResult.householdIncome);
  const incomeAmount = extractedIncome.amount ?? fallbackIncomeAmount ?? null;
  const incomeFrequency =
    extractedIncome.frequency !== "unknown"
      ? extractedIncome.frequency
      : detectIncomeFrequency(aiResult.householdIncome);
  const normalizedMonthly = normalizeIncomeToMonthly({
    amount: incomeAmount,
    frequency: incomeFrequency,
    hoursPerWeek: extractedIncome.hoursPerWeek,
  });
  const extractedRent = extractRentFromText(input);
  const propertyRent = getPropertyRent(propertyContext);
  const rentAmount =
    propertyRent ?? extractedRent.amount ?? parseRentToMonthly(aiResult.monthlyRent) ?? null;

  const incomeData: NormalizedIncome = {
    amount: incomeAmount,
    frequency: incomeFrequency,
    hoursPerWeek: extractedIncome.hoursPerWeek,
    rawText: aiResult.householdIncome,
    normalizedMonthly,
    warning:
      getAffordabilityWarning({
        amount: incomeAmount,
        frequency: incomeFrequency,
        rawText: aiResult.householdIncome,
        normalizedMonthly,
      }) ?? undefined,
  };

  let aiScore = clampScore(aiResult.ninjaDecisionScore, 65);
  let aiReadiness = clampPercent(aiResult.readiness, 50);

  // Adjust AI scores with deterministic affordability
  if (normalizedMonthly !== null && rentAmount !== null && rentAmount > 0) {
    const ratio = normalizedMonthly / rentAmount;
    if (ratio >= 3) {
      aiScore = Math.min(95, aiScore + 4);
      aiReadiness = Math.min(98, aiReadiness + 3);
    } else if (ratio >= 2.5) {
      aiScore = Math.min(95, aiScore + 2);
    } else if (ratio < 1.5 && ratio > 0) {
      aiScore = Math.max(50, aiScore - 4);
      aiReadiness = Math.max(30, aiReadiness - 3);
    } else if (ratio <= 1 && ratio > 0) {
      aiScore = Math.max(45, aiScore - 8);
      aiReadiness = Math.max(25, aiReadiness - 5);
    }
  }
  const aiMoveInCosts = extractMoveInCosts(
    [input, aiResult.confidenceReason, aiResult.missingDocuments.join("\n")].join("\n"),
    rentAmount,
  );
  const aiProofOfFundsDoc = aiMoveInCosts.dueAtSigningAmount
    ? `Proof of funds for $${aiMoveInCosts.dueAtSigningAmount.toLocaleString()} due at signing`
    : "Proof of funds for move-in costs";
  const aiMissingDocuments = aiResult.missingDocuments.some((item) =>
    /proof of funds|move[- ]?in costs?|due at signing/i.test(item),
  )
    ? [
        ...aiResult.missingDocuments.filter(
          (item) => !/proof of funds|move[- ]?in costs?|due at signing/i.test(item),
        ),
        aiProofOfFundsDoc,
      ]
    : aiResult.missingDocuments;

  return NextResponse.json({
    applicantName: aiResult.applicantName,
    phone: aiResult.phone,
    email: aiResult.email,
    moveInDate: aiResult.moveInDate,
    monthlyRent: formatRentDisplay(rentAmount),
    monthlyRentAmount: rentAmount ?? 0,
    householdIncome: aiResult.householdIncome,
    householdIncomeDisplay:
      incomeAmount !== null && incomeAmount > 0
        ? formatIncomeDisplay(incomeData)
        : aiResult.householdIncome,
    incomeAmount: incomeAmount ?? 0,
    incomeFrequency,
    incomeHoursPerWeek: extractedIncome.hoursPerWeek,
    normalizedMonthlyIncome: normalizedMonthly,
    affordabilityDisplay: formatAffordabilityDisplay(
      normalizedMonthly,
      rentAmount,
    ),
    incomeWarning: incomeData.warning ?? null,
    employmentInfo: aiResult.employmentInfo,
    voucherInfo: aiResult.voucherInfo,
    tenantPortion: aiResult.tenantPortion,
    occupants: aiResult.occupants,
    petsSmoking: aiResult.petsSmoking,
    documentsMentioned: aiResult.documentsMentioned,
    missingDocuments: aiMissingDocuments,
    redFlagsOrConcerns: aiResult.redFlagsOrConcerns,
    followUpQuestions: aiResult.followUpQuestions,
    suggestedStatus: aiResult.suggestedStatus,
    ninjaDecisionScore: aiScore,
    readiness: aiReadiness,
    riskLevel: aiResult.riskLevel,
    confidenceLevel: aiResult.confidenceLevel,
    confidenceReason: aiResult.confidenceReason,
    mainStrength: aiResult.mainStrength,
    mainConcern: aiResult.mainConcern,
    bestNextStep: aiResult.bestNextStep,
    suggestedMessage: aiResult.suggestedMessage,
    demoMode: false,
  });
}
