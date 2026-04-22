import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongoose";
import { registerSchema } from "@/lib/validators";
import Organization from "@/models/Organization";
import User from "@/models/User";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid input." }, { status: 400 });
  }

  await connectToDatabase();

  const existingUser = await User.findOne({ email: parsed.data.email }).lean();
  if (existingUser) {
    return NextResponse.json({ message: "An account with that email already exists." }, { status: 409 });
  }

  const baseSlug = slugify(parsed.data.organizationName);
  let slug = baseSlug;
  let suffix = 1;

  while (await Organization.findOne({ slug }).lean()) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const organization = await Organization.create({
    name: parsed.data.organizationName,
    slug,
    plan: "starter",
    billingStatus: "inactive"
  });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    organizationId: organization._id,
    role: "owner"
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

