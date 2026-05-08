/**
 * lib/rate-limit.ts
 *
 * Redis-free sliding window rate limiter using in-process memory.
 *
 * Suitable for single-instance deployments (Render, Railway, Fly.io).
 * When scaling to multiple instances, replace SlidingWindowStore with
 * a Redis-backed implementation — the checkRateLimit() API stays the same.
 *
 * Local development bypass:
 *   When NODE_ENV !== "production", all checks are no-ops (returns allowed).
 *   This means rate limits never fire during local development or tests.
 */

import { NextRequest, NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Human-readable label for logging (e.g. "ai-extract"). */
  label?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Milliseconds until the oldest request in the window expires. */
  resetMs: number;
}

// ── In-process sliding window store ──────────────────────────────────────────

/** Maps a rate-limit key to an array of request timestamps (ms). */
const store = new Map<string, number[]>();

/** Prune expired entries every 5 minutes to prevent unbounded memory growth. */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      // Keep only entries from the last 10 minutes (generous upper bound)
      const pruned = timestamps.filter((t) => now - t < 10 * 60 * 1000);
      if (pruned.length === 0) {
        store.delete(key);
      } else {
        store.set(key, pruned);
      }
    }
  },
  5 * 60 * 1000,
).unref(); // .unref() so this timer doesn't keep the process alive in tests

// ── IP extraction ─────────────────────────────────────────────────────────────

/**
 * Extracts the real client IP from a Next.js request.
 * Render (and most proxies) set x-forwarded-for.
 * Falls back to x-real-ip, then "unknown".
 */
export function getClientIp(request: NextRequest | Request): string {
  const headers =
    request instanceof NextRequest
      ? request.headers
      : new Headers((request as Request).headers);

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for may be a comma-separated list; take the first (client) IP
    return forwarded.split(",")[0].trim();
  }

  return headers.get("x-real-ip") ?? "unknown";
}

// ── Core check ────────────────────────────────────────────────────────────────

/**
 * Checks whether a given key is within the rate limit.
 * Mutates the store (records the current request timestamp).
 */
function checkWindow(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - options.windowMs;

  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= options.limit) {
    const oldestInWindow = timestamps[0];
    const resetMs = oldestInWindow + options.windowMs - now;
    return { allowed: false, remaining: 0, resetMs: Math.max(0, resetMs) };
  }

  timestamps.push(now);
  store.set(key, timestamps);

  return {
    allowed: true,
    remaining: options.limit - timestamps.length,
    resetMs: options.windowMs,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Checks rate limits for a request using both IP and user identity.
 *
 * - In non-production environments, always returns allowed (no-op).
 * - Checks IP bucket first (protects unauthenticated endpoints).
 * - If userId is provided, also checks a per-user bucket.
 * - The stricter of the two limits applies.
 *
 * @param request  The incoming Next.js request
 * @param options  Limit configuration
 * @param userId   Optional authenticated user ID for per-user limiting
 * @returns        RateLimitResult — check `.allowed` before proceeding
 */
export function checkRateLimit(
  request: NextRequest | Request,
  options: RateLimitOptions,
  userId?: string,
): RateLimitResult {
  // ── Local development / test bypass ───────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    return {
      allowed: true,
      remaining: options.limit,
      resetMs: options.windowMs,
    };
  }

  const label = options.label ?? "default";
  const ip = getClientIp(request);

  // ── IP-based check ─────────────────────────────────────────────────────────
  const ipResult = checkWindow(`ip:${label}:${ip}`, options);
  if (!ipResult.allowed) {
    return ipResult;
  }

  // ── Per-user check (authenticated requests only) ───────────────────────────
  if (userId) {
    const userResult = checkWindow(`user:${label}:${userId}`, options);
    if (!userResult.allowed) {
      return userResult;
    }
    // Return the more restrictive remaining count
    return {
      allowed: true,
      remaining: Math.min(ipResult.remaining, userResult.remaining),
      resetMs: Math.max(ipResult.resetMs, userResult.resetMs),
    };
  }

  return ipResult;
}

/**
 * Builds a 429 Too Many Requests NextResponse with proper headers.
 *
 * Headers set:
 *   Retry-After        — seconds until the client may retry
 *   X-RateLimit-Reset  — Unix timestamp (seconds) when the window resets
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = Math.ceil(result.resetMs / 1000);
  const resetAt = Math.floor((Date.now() + result.resetMs) / 1000);

  return NextResponse.json(
    {
      message: "Too many requests. Please slow down and try again shortly.",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Reset": String(resetAt),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
