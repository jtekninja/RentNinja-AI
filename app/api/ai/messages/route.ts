import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createStructuredOpenAIResponse, hasOpenAIConfig } from "@/lib/openai";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const AI_MESSAGE_LIMIT = {
  limit: 20,
  windowMs: 60_000,
  label: "ai-message",
};

function demoMessage(template: string, context: string) {
  if (/polish/i.test(template)) {
    return {
      message:
        "Hi, thank you for the update. To keep your application moving, please send the remaining objective screening items when available. Once we receive them, we can review the file and confirm the next step.",
      fairHousingReminder:
        "Use objective, policy-based criteria only. Do not request or use protected class information.",
      demoMode: true,
      contextUsed: context.slice(0, 240),
    };
  }

  return {
    message:
      `Hi, thanks for your application. We are reviewing the file and need the remaining objective screening items before the next step. ` +
      `Please send any missing income, identification, rental-history, or program documents when available. Template: ${template || "follow-up"}.`,
    fairHousingReminder:
      "Use objective, policy-based criteria only. Do not request or use protected class information.",
    demoMode: true,
    contextUsed: context.slice(0, 240),
  };
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const rlResult = checkRateLimit(request, AI_MESSAGE_LIMIT, session.user.id);
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  const body = await request.json().catch(() => ({}));
  const template = String(body?.template || "Request missing documents").trim();
  const context = String(body?.context || "").trim();
  const recipient = String(body?.recipient || "applicant").trim();

  if (!hasOpenAIConfig()) {
    return NextResponse.json(demoMessage(template, context));
  }

  const result = await createStructuredOpenAIResponse<{
    message: string;
    fairHousingReminder: string;
  }>({
    schemaName: "rentninja_message",
    schemaDescription: "A compliant tenant-screening follow-up message.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["message", "fairHousingReminder"],
      properties: {
        message: { type: "string" },
        fairHousingReminder: { type: "string" },
      },
    },
    input: [
      {
        role: "system",
        content:
          "Write concise, professional rental applicant workflow messages. Do not include or ask for protected class information. Keep recommendations tied to lawful objective criteria such as documents, income verification, references, timing, property rules, and screening process.",
      },
      {
        role: "user",
        content: `Template: ${template}\nRecipient: ${recipient}\nContext: ${context}`,
      },
    ],
  });

  return NextResponse.json({ ...result, demoMode: false });
}
