import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { recordAuditLog } from "@/lib/audit-log";
import { connectToDatabase } from "@/lib/mongoose";
import { adminUserUpdateSchema } from "@/lib/validators";
import User from "@/models/User";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

async function findWorkspaceUser(userId: string, organizationId: string) {
  return User.findOne({
    _id: new Types.ObjectId(userId),
    organizationId: new Types.ObjectId(organizationId)
  });
}

async function countWorkspaceOwners(organizationId: string) {
  return User.countDocuments({
    organizationId: new Types.ObjectId(organizationId),
    role: "owner"
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  if (session.user.role !== "owner") {
    return NextResponse.json({ message: "Only owners can manage workspace users." }, { status: 403 });
  }

  const { id } = await context.params;
  const json = await request.json();
  const parsed = adminUserUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid user update." }, { status: 400 });
  }

  await connectToDatabase();

  const user = await findWorkspaceUser(id, session.user.organizationId);
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  let roleChanged = false;
  if (parsed.data.role) {
    if (user.role === "owner" && parsed.data.role !== "owner") {
      const ownerCount = await countWorkspaceOwners(session.user.organizationId);
      if (ownerCount <= 1) {
        return NextResponse.json({ message: "You must keep at least one owner on the workspace." }, { status: 400 });
      }
    }

    roleChanged = user.role !== parsed.data.role;
    user.role = parsed.data.role;
  }

  let passwordReset = false;
  if (parsed.data.password) {
    user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    passwordReset = true;
  }

  await user.save();

  if (roleChanged) {
    await recordAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "user.role_updated",
      entityType: "user",
      entityId: String(user._id),
      message: `Changed ${user.email} role to ${user.role}.`,
      metadata: {
        role: user.role
      }
    });
  }

  if (passwordReset) {
    await recordAuditLog({
      organizationId: session.user.organizationId,
      actorUserId: session.user.id,
      actorName: session.user.name,
      actorEmail: session.user.email,
      action: "user.password_reset",
      entityType: "user",
      entityId: String(user._id),
      message: `Reset password for ${user.email}.`
    });
  }

  return NextResponse.json({
    _id: String(user._id),
    name: user.name,
    email: user.email,
    username: user.username || "",
    role: user.role,
    createdAt: new Date(String(user.createdAt)).toISOString()
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  if (session.user.role !== "owner") {
    return NextResponse.json({ message: "Only owners can manage workspace users." }, { status: 403 });
  }

  const { id } = await context.params;

  if (id === session.user.id) {
    return NextResponse.json({ message: "You cannot remove your own owner account." }, { status: 400 });
  }

  await connectToDatabase();

  const user = await findWorkspaceUser(id, session.user.organizationId);
  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  if (user.role === "owner") {
    const ownerCount = await countWorkspaceOwners(session.user.organizationId);
    if (ownerCount <= 1) {
      return NextResponse.json({ message: "You must keep at least one owner on the workspace." }, { status: 400 });
    }
  }

  const removedUserId = String(user._id);
  const removedUserEmail = user.email;
  await user.deleteOne();
  await recordAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    actorName: session.user.name,
    actorEmail: session.user.email,
    action: "user.removed",
    entityType: "user",
    entityId: removedUserId,
    level: "warning",
    message: `Removed team member ${removedUserEmail}.`
  });
  return NextResponse.json({ ok: true });
}
