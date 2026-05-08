import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

// 20 auth requests (sign-in attempts) per IP per minute — brute-force protection
const AUTH_LIMIT = {
  limit: 20,
  windowMs: 60_000,
  label: "auth",
};

export async function GET(request: NextRequest) {
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  const rlResult = checkRateLimit(request, AUTH_LIMIT);
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  return handlers.POST(request);
}
