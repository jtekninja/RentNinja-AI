import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { recordAuditLog } from "@/lib/audit-log";
import { connectToDatabase } from "@/lib/mongoose";
import { adminUserCreateSchema } from "@/lib/validators";
import User from "@/models/User";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  if (session.user.role !== "owner") {
    return NextResponse.json({ message: "Only owners can manage workspace users." }, { status: 403 });
  }

  const json = await request.json();
  const parsed = adminUserCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid user." }, { status: 400 });
  }

  await connectToDatabase();

  const existingEmail = await User.findOne({ email: parsed.data.email }).lean();
  if (existingEmail) {
    return NextResponse.json({ message: "A user with that email already exists." }, { status: 409 });
  }

  if (parsed.data.username) {
    const existingUsername = await User.findOne({ username: parsed.data.username }).lean();
    if (existingUsername) {
      return NextResponse.json({ message: "That username is already in use." }, { status: 409 });
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    username: parsed.data.username || undefined,
    passwordHash,
    organizationId: session.user.organizationId,
    role: parsed.data.role
  });

  await recordAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    actorName: session.user.name,
    actorEmail: session.user.email,
    action: "user.created",
    entityType: "user",
    entityId: String(user._id),
    message: `Created team member ${user.email}.`,
    metadata: {
      role: user.role
    }
  });

  return NextResponse.json(
    {
      _id: String(user._id),
      name: user.name,
      email: user.email,
      username: user.username || "",
      role: user.role,
      createdAt: new Date(String(user.createdAt)).toISOString()
    },
    { status: 201 }
  );
}
