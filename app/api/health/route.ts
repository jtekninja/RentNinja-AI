import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { env } from "@/lib/env";

/**
 * GET /api/health
 *
 * Production health check for Render uptime monitoring.
 *
 * - Verifies MongoDB connectivity (mongoose readyState + server ping)
 * - Verifies critical environment variables are present
 * - Returns 200 when all checks pass, 503 when any fail
 * - Never exposes secret values, URIs, or internal details
 *
 * Render configuration:
 *   Health Check Path: /api/health
 *   This endpoint requires no authentication.
 */

interface HealthCheck {
  status: "ok" | "failing";
  message: string;
}

interface HealthResponse {
  status: "ok" | "degraded";
  uptime: number;
  checks: Record<string, HealthCheck>;
}

/**
 * We use the underlying MongoClient .db().admin().ping() when the
 * mongoose connection exists. For mongoose, readyState === 1 means
 * connected but does not guarantee the server is still reachable;
 * a ping confirms it's alive.
 */
async function checkMongo(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (mongoose.connection.readyState !== 1) {
      return {
        status: "failing",
        message: "MongoDB not connected",
      };
    }

    const client = mongoose.connection.getClient();
    await client.db().admin().ping();
    const ms = Date.now() - start;

    return {
      status: "ok",
      message: `MongoDB reachable (${ms}ms)`,
    };
  } catch {
    return {
      status: "failing",
      message: "MongoDB ping failed",
    };
  }
}

export async function GET() {
  const mongoCheck = await checkMongo();

  const allChecks: Record<string, HealthCheck> = {
    mongo: mongoCheck,
    auth_secret: env.authSecret
      ? { status: "ok", message: "AUTH_SECRET is set" }
      : { status: "failing", message: "AUTH_SECRET is missing" },
    mongodb_uri: env.mongoUri
      ? { status: "ok", message: "MONGODB_URI is set" }
      : { status: "failing", message: "MONGODB_URI is missing" },
  };

  const allPassing = Object.values(allChecks).every((c) => c.status === "ok");

  const body: HealthResponse = {
    status: allPassing ? "ok" : "degraded",
    uptime: Math.floor(process.uptime()),
    checks: allChecks,
  };

  return NextResponse.json(body, { status: allPassing ? 200 : 503 });
}
