import { env } from "@/lib/env";

type StructuredOutputRequest = {
  input: Array<{
    role: "system" | "user";
    content: string | Array<Record<string, unknown>>;
  }>;
  schemaName: string;
  schemaDescription: string;
  schema: Record<string, unknown>;
};

function extractOutputText(payload: any) {
  const messages = Array.isArray(payload?.output) ? payload.output : [];

  for (const item of messages) {
    if (item?.type !== "message" || !Array.isArray(item?.content)) {
      continue;
    }

    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
      if (typeof content?.refusal === "string") {
        throw new Error(content.refusal);
      }
    }
  }

  throw new Error("OpenAI response did not include output text.");
}

export function hasOpenAIConfig() {
  return Boolean(env.openAiApiKey);
}

export async function uploadOpenAIFile(file: File) {
  if (!env.openAiApiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const formData = new FormData();
  formData.append("purpose", "user_data");
  formData.append("file", file);

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiApiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI file upload failed: ${errorText}`);
  }

  const payload = await response.json();
  if (!payload?.id) {
    throw new Error("OpenAI file upload did not return a file ID.");
  }

  return String(payload.id);
}

export async function createStructuredOpenAIResponse<T>({
  input,
  schemaName,
  schemaDescription,
  schema
}: StructuredOutputRequest): Promise<T> {
  if (!env.openAiApiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`
    },
    body: JSON.stringify({
      model: env.openAiModel,
      input,
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          description: schemaDescription,
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const payload = await response.json();
  return JSON.parse(extractOutputText(payload)) as T;
}
