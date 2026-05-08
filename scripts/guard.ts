/**
 * scripts/guard.ts
 *
 * Safety guard for destructive seed/reset scripts.
 *
 * Usage:
 *   import { assertSafeToRun } from "./guard";
 *   assertSafeToRun("seed.ts");   // call before any DB work
 *
 * Rules enforced:
 *   1. NODE_ENV === "production"  → always blocked, no override
 *   2. MONGODB_URI points to a cloud host (*.mongodb.net) → blocked
 *   3. --confirm flag missing     → print instructions and exit 0 (safe no-op)
 */

function redactUri(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.password) url.password = "***";
    return url.toString();
  } catch {
    // Not a valid URL — redact anything that looks like user:pass@
    return uri.replace(/:\/\/[^@]+@/, "://***:***@");
  }
}

function isCloudUri(uri: string): boolean {
  return /\.mongodb\.net/i.test(uri);
}

export function assertSafeToRun(scriptName: string): void {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const mongoUri = process.env.MONGODB_URI ?? "";
  const hasConfirm = process.argv.includes("--confirm");

  // ── Rule 1: Hard block in production ──────────────────────────────────────
  if (nodeEnv === "production") {
    console.error("");
    console.error(
      "╔══════════════════════════════════════════════════════════╗",
    );
    console.error(
      "║  BLOCKED: Seed scripts cannot run in production.         ║",
    );
    console.error(
      "║                                                           ║",
    );
    console.error(`║  Script : ${scriptName.padEnd(47)}║`);
    console.error(
      "║  NODE_ENV: production                                     ║",
    );
    console.error(
      "║                                                           ║",
    );
    console.error(
      "║  If you need to reset production data, use the           ║",
    );
    console.error(
      "║  MongoDB Atlas UI or a controlled migration script.       ║",
    );
    console.error(
      "╚══════════════════════════════════════════════════════════╝",
    );
    console.error("");
    process.exit(1);
  }

  // ── Rule 2: Block if targeting a cloud database ───────────────────────────
  if (mongoUri && isCloudUri(mongoUri)) {
    const redacted = redactUri(mongoUri);
    console.error("");
    console.error(
      "╔══════════════════════════════════════════════════════════╗",
    );
    console.error(
      "║  BLOCKED: MONGODB_URI points to a cloud database.        ║",
    );
    console.error(
      "╚══════════════════════════════════════════════════════════╝",
    );
    console.error(`  URI: ${redacted}`);
    console.error("");
    console.error("  Seed scripts are intended for local development only.");
    console.error(
      "  Running against a cloud database will permanently destroy data.",
    );
    console.error("");
    console.error(
      "  To seed a staging database, use a local URI and restore a dump,",
    );
    console.error("  or use the MongoDB Atlas UI directly.");
    console.error("");
    process.exit(1);
  }

  // ── Rule 3: Require explicit --confirm flag ────────────────────────────────
  if (!hasConfirm) {
    const display = mongoUri
      ? redactUri(mongoUri)
      : "(not set — will use localhost fallback)";
    console.log("");
    console.log(`⚠️  Destructive script: ${scriptName}`);
    console.log("");
    console.log(
      "  This script will DELETE and recreate data in your database.",
    );
    console.log(`  Target URI : ${display}`);
    console.log(`  NODE_ENV   : ${nodeEnv}`);
    console.log("");
    console.log("  To proceed, re-run with the --confirm flag:");
    console.log(`    npx tsx scripts/${scriptName} --confirm`);
    console.log("");
    console.log("  No changes were made.");
    process.exit(0);
  }

  // ── All checks passed — log what we are about to do ───────────────────────
  const display = mongoUri
    ? redactUri(mongoUri)
    : "mongodb://127.0.0.1:27017/rentninja-ai (localhost fallback)";
  console.log("");
  console.log("✅ Safety checks passed.");
  console.log(`  Script   : ${scriptName}`);
  console.log(`  NODE_ENV : ${nodeEnv}`);
  console.log(`  Target   : ${display}`);
  console.log("");
  console.log("⚠️  Proceeding with destructive operations...");
  console.log("");
}
