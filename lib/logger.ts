const redactedFields = new Set([
  "passwordHash",
  "password",
  "secret",
  "token",
  "authorization",
  "stripeSecretKey",
  "stripeWebhookSecret",
  "jwt",
  "accessToken",
  "refreshToken",
  "apiKey",
  "sessionToken",
]);

type LogMeta = Record<string, unknown>;

function redact(meta: LogMeta): LogMeta {
  const result: LogMeta = {};

  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();

    if (redactedFields.has(lowerKey)) {
      result[key] = "[REDACTED]";
    } else if (
      value !== null &&
      value !== undefined &&
      typeof value === "object" &&
      !(value instanceof Error)
    ) {
      result[key] = redact(value as LogMeta);
    } else if (value instanceof Error) {
      result[key] = {
        message: value.message,
        name: value.name,
        stack: process.env.NODE_ENV === "development" ? value.stack : undefined,
      };
    } else {
      result[key] = value;
    }
  }

  return result;
}

function writeLog(
  level: "info" | "warn" | "error",
  message: string,
  meta?: LogMeta & { requestId?: string },
) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta ? redact(meta) : undefined),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "info":
      console.log(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export const logger = {
  info(message: string, meta?: LogMeta & { requestId?: string }) {
    writeLog("info", message, meta);
  },
  warn(message: string, meta?: LogMeta & { requestId?: string }) {
    writeLog("warn", message, meta);
  },
  error(message: string, meta?: LogMeta & { requestId?: string }) {
    writeLog("error", message, meta);
  },
};
