import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongoose";
import { registerSchema } from "@/lib/validators";
import { slugify } from "@/lib/slugify";
import Organization from "@/models/Organization";
import User from "@/models/User";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { badRequest, conflict, internalError } from "@/lib/api-error";

// 5 registrations per IP per 10 minutes — prevents account creation spam
const REGISTER_LIMIT = {
  limit: 5,
  windowMs: 10 * 60_000,
  label: "register",
};

export async function POST(request: Request) {
  // Rate limit by IP only (no user session at registration time)
  const rlResult = checkRateLimit(request, REGISTER_LIMIT);
  if (!rlResult.allowed) return rateLimitResponse(rlResult);

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return badRequest(request, "Invalid JSON body");
  }

  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid input.";
    return badRequest(request, firstIssue);
  }

  try {
    await connectToDatabase();
  } catch {
    return internalError(request, new Error("Database connection failed"), {
      logContext: { action: "register.connect" },
    });
  }

  try {
    const existingUser = await User.findOne({
      email: parsed.data.email,
    }).lean();
    if (existingUser) {
      return conflict(request, "An account with that email already exists.");
    }
  } catch (error) {
    return internalError(request, error, {
      logContext: { action: "register.checkExistingUser" },
    });
  }

  const baseSlug = slugify(parsed.data.organizationName);
  let slug = baseSlug;
  let suffix = 1;

  try {
    while (await Organization.findOne({ slug }).lean()) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }
  } catch (error) {
    return internalError(request, error, {
      logContext: { action: "register.slugCheck" },
    });
  }

  let organization;
  try {
    organization = await Organization.create({
      name: parsed.data.organizationName,
      slug,
      plan: "free",
      billingStatus: "trialing",
      customerType: parsed.data.customerType,
    });
  } catch (error) {
    return internalError(request, error, {
      logContext: { action: "register.createOrganization" },
    });
  }

  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(parsed.data.password, 12);
  } catch (error) {
    return internalError(request, error, {
      logContext: { action: "register.hashPassword" },
    });
  }

  try {
    await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      organizationId: organization._id,
      role: "owner",
      customerType: parsed.data.customerType,
    });
  } catch (error) {
    return internalError(request, error, {
      logContext: { action: "register.createUser" },
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
