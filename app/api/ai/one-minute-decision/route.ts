import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStructuredOpenAIResponse, hasOpenAIConfig } from "@/lib/openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const ONE_MINUTE_LIMIT = {
  limit: 20,
  windowMs: 60_000,
  label: "one-minute-decision",
};

type DecisionResult = {
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
  demoMode: boolean;
};

function matchFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function mockDecision(input: string): DecisionResult {
  const lower = input.toLowerCase();
  const email = matchFirst(input, [/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i]);
  const phone = matchFirst(input, [/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/]);
  const rent = matchFirst(input, [
    /rent(?: is|:)?\s*\$?([\d,]+)/i,
    /\$([\d,]+)\s*(?:rent|\/month|per month)/i,
  ]);
  const income = matchFirst(input, [
    /income(?: is|:)?\s*\$?([\d,]+)/i,
    /make(?:s)?\s*\$?([\d,]+)/i,
  ]);
  const name = matchFirst(input, [
    /name(?: is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
    /applicant(?: is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/,
  ]);
  const hasVoucher = /voucher|section 8|subsidy|case worker|shopping letter/i.test(input);
  const docs = [
    lower.includes("id") ? "Government ID" : "",
    lower.includes("paystub") || lower.includes("proof of income") ? "Proof of income" : "",
    lower.includes("bank") ? "Bank statements" : "",
    lower.includes("landlord") ? "Landlord reference" : "",
    hasVoucher ? "Voucher note" : "",
  ].filter(Boolean);
  const missing = [
    docs.includes("Government ID") ? "" : "Government ID",
    docs.includes("Proof of income") ? "" : "Proof of income",
    docs.includes("Bank statements") ? "" : "Bank statements",
    docs.includes("Landlord reference") ? "" : "Landlord reference",
    hasVoucher && !lower.includes("shopping letter") ? "Voucher shopping letter" : "",
  ].filter(Boolean);
  const readiness = Math.max(35, 100 - missing.length * 12);
  const score = Math.max(58, Math.min(91, readiness - (hasVoucher ? 2 : 0) + (income ? 8 : 0)));
  const riskLevel = score >= 78 ? "Low" : score >= 64 ? "Medium" : "High";

  return {
    applicantName: name || "Applicant from pasted info",
    phone,
    email,
    moveInDate: matchFirst(input, [/move[- ]?in(?: date)?(?: is|:)?\s*([A-Za-z0-9, /-]+)/i]),
    monthlyRent: rent ? `$${rent}` : "Not found",
    householdIncome: income ? `$${income}` : "Not found",
    employmentInfo: matchFirst(input, [/work(?:s|ing)?(?: at| for)?\s*([^.\n]+)/i]) || "Not clearly stated",
    voucherInfo: hasVoucher ? "Voucher/subsidy mentioned. Verify process documents only." : "No voucher/subsidy mentioned",
    tenantPortion: matchFirst(input, [/tenant portion(?: is|:)?\s*\$?([\d,]+)/i]) || "Not found",
    occupants: matchFirst(input, [/occupants?(?: is|:)?\s*([^.\n]+)/i]) || "Not found",
    petsSmoking: matchFirst(input, [/(?:pets?|smoking)(?: is|:)?\s*([^.\n]+)/i]) || "Not found",
    documentsMentioned: docs.length ? docs : ["Application text pasted"],
    missingDocuments: missing,
    redFlagsOrConcerns: missing.length
      ? ["File is not ready until missing documents are collected."]
      : ["No major process concern detected from the pasted information."],
    followUpQuestions: missing.slice(0, 3).map((item) => `Can you send ${item.toLowerCase()}?`),
    suggestedStatus: missing.length ? "Missing Documents" : "Ready for Review",
    ninjaDecisionScore: score,
    readiness,
    riskLevel,
    confidenceLevel: input.length > 350 ? "High" : input.length > 120 ? "Medium" : "Low",
    confidenceReason:
      input.length > 350
        ? "The pasted info includes enough detail for a higher-confidence draft review."
        : input.length > 120
          ? "Some core details were found, but missing documents and unclear fields still need follow-up."
          : "The pasted info is brief, so the AI review should be treated as a low-confidence draft.",
    mainStrength: income ? "Income information was included in the pasted packet." : "Applicant contact details can be staged for follow-up.",
    mainConcern: missing[0] || "Confirm all required documents against your screening checklist.",
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
  if (!input) {
    return NextResponse.json({ message: "Paste applicant info first." }, { status: 400 });
  }

  if (!hasOpenAIConfig()) {
    return NextResponse.json(mockDecision(input));
  }

  const result = await createStructuredOpenAIResponse<Omit<DecisionResult, "demoMode">>({
    schemaName: "one_minute_applicant_decision",
    schemaDescription: "Clean applicant decision card and messy-info extraction.",
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
        monthlyRent: { type: "string" },
        householdIncome: { type: "string" },
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
          "You are RentNinja AI. Extract messy rental applicant info and create a concise 1-Minute Applicant Decision. Use objective rental criteria only: income/rent ratio, documentation completeness, rental history, references, timeline readiness, property policy fit, screening scores if provided, voucher/subsidy process clarity, and missing information. Do not analyze or recommend based on protected classes including race, religion, national origin, sex, disability, familial status, source of income, age where applicable, or local protected categories. Treat voucher/source-of-income information only as documentation/process clarity.",
      },
      { role: "user", content: input },
    ],
  });

  return NextResponse.json({ ...result, demoMode: false });
}
