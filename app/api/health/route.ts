import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Lightweight health check for Render uptime monitoring.
 *
 * Requirements:
 * - Returns 200 immediately (no DB, no auth, no external API calls)
 * - Render polls this before marking the service as healthy
 * - No imports from lib/ (avoids env validation, mongoose, etc.)
 *
 * Render config:
 *   Health Check Path: /api/health
 *   This endpoint requires no authentication.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
  });
}
