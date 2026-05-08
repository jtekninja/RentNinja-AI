/**
 * lib/api-error.ts
 *
 * Centralized API error normalization for every route handler.
 *
 * - Consistent error shape: { error: { message, status, requestId } }
 * - No secret leakage — only safe messages go to the client
 * - Server-side structured JSON logging with request ID correlation
 * - Request IDs read from the x-request-id header set by proxy.ts
 */

import { NextResponse } from "next/server";
import { logger } from "./logger";

// ── Public-facing messages (client-safe, no internal details) ──────────────────

const CLIENT_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input and try again.",
  401: "You must be signed in to access this resource.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "A record with that information already exists.",
  429: "Too many requests. Please slow down and try again shortly.",
  500: "Something went wrong. Please try again in a moment.",
  503: "This feature is temporarily unavailable. Please try again later.",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getRequestId(request: Request): string {
  try {
    return request.headers.get("x-request-id") ?? crypto.randomUUID();
  } catch {
    return crypto.randomUUID();
  }
}

function safeString(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

// ── Main API ───────────────────────────────────────────────────────────────────

export interface ApiErrorMeta {
  /** Additional context to attach to the server-side log entry. */
  logContext?: Record<string, unknown>;
  /** Log level override. Defaults to "warn" for 4xx, "error" for 5xx. */
  level?: "warn" | "error";
}

/**
 * Returns a normalized error response.
 *
 * Logs the full error server-side (with request ID, no secrets).
 * Sends only a safe public message to the client.
 *
 * Example:
 *   return apiError(request, 404, "Applicant not found", {
 *     logContext: { applicantId: id },
 *   });
 */
export function apiError(
  request: Request,
  status: number,
  detail: unknown,
  meta: ApiErrorMeta = {},
): NextResponse {
  const requestId = getRequestId(request);
  const publicMessage =
    CLIENT_MESSAGES[status] ?? "An unexpected error occurred.";
  const errorDetail = safeString(detail);

  // ── Server-side log ─────────────────────────────────────────────────────────
  const level = meta.level ?? (status >= 500 ? "error" : "warn");
  logger[level](
    `${request.method ?? "?"} ${new URL(request.url).pathname} → ${status}`,
    {
      requestId,
      status,
      errorDetail,
      ...meta.logContext,
    },
  );

  // ── Client response ──────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      error: {
        message: publicMessage,
        status,
        requestId,
      },
    },
    { status },
  );
}

// ── Convenience wrappers ───────────────────────────────────────────────────────

export function badRequest(
  request: Request,
  detail?: unknown,
  meta?: ApiErrorMeta,
) {
  return apiError(request, 400, detail ?? "Bad request", meta);
}

export function unauthorized(request: Request) {
  return apiError(request, 401, "Unauthorized");
}

export function forbidden(request: Request, meta?: ApiErrorMeta) {
  return apiError(request, 403, "Forbidden", meta);
}

export function notFound(
  request: Request,
  detail?: string,
  meta?: ApiErrorMeta,
) {
  return apiError(request, 404, detail ?? "Not found", meta);
}

export function conflict(
  request: Request,
  detail?: string,
  meta?: ApiErrorMeta,
) {
  return apiError(request, 409, detail ?? "Conflict", meta);
}

export function internalError(
  request: Request,
  error: unknown,
  meta?: ApiErrorMeta,
) {
  return apiError(request, 500, error, meta);
}

export function unavailable(
  request: Request,
  detail?: string,
  meta?: ApiErrorMeta,
) {
  return apiError(request, 503, detail ?? "Service unavailable", meta);
}
