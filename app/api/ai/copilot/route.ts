import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStructuredOpenAIResponse, hasOpenAIConfig } from "@/lib/openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const AI_COPILOT_LIMIT = {
  limit: 20,
  windowMs: 60_000,
  label: "ai-copilot",
};

function mockCopilot(prompt: string) {
  const lower = prompt.toLowerCase();
  const focus = lower.includes("missing")
    ? "missing documents"
    : lower.includes("compare")
      ? "applicant comparison"
      : lower.includes("owner")
        ? "owner report"
        : "next steps";

  return {
    answer: `Leasing Copilot demo response: focus on ${focus}. Use the Ninja Decision Score, Applicant Readiness Meter, and objective missing-document checklist before making a decision. Next step: send a professional follow-up requesting any missing documents and prepare an owner summary for the strongest ready candidate.`,
    actions: ["Copy", "Save", "Generate message", "Create report"],
    fairHousingReminder:
      "RentNinja uses objective screening criteria only. Final rental decisions are your responsibility.",
    demoMode: true,
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rlResult = checkRateLimit(request, AI_COPILOT_LIMIT, session.user.id);
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  const body = await request.json().catch(() => ({}));
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) {
    return NextResponse.json({ message: "Prompt is required." }, { status: 400 });
  }

  if (!hasOpenAIConfig()) {
    return NextResponse.json(mockCopilot(prompt));
  }

  const result = await createStructuredOpenAIResponse<{
    answer: string;
    actions: string[];
    fairHousingReminder: string;
  }>({
    schemaName: "leasing_copilot_response",
    schemaDescription: "Objective leasing copilot answer with safe actions.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["answer", "actions", "fairHousingReminder"],
      properties: {
        answer: { type: "string" },
        actions: { type: "array", items: { type: "string" } },
        fairHousingReminder: { type: "string" },
      },
    },
    input: [
      {
        role: "system",
        content:
          "You are Leasing Copilot for RentNinja AI. Help landlords, realtors, leasing agents, owners, and property managers with objective screening workflow only. Never recommend based on protected classes including race, religion, national origin, sex, disability, familial status, source of income, age where applicable, or local protected categories. Focus on income/rent ratio, documentation completeness, rental history, references, timeline readiness, property policy fit, screening scores if provided, and missing information.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return NextResponse.json({ ...result, demoMode: false });
}
