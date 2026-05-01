import { Types } from "mongoose";
import AuditLog from "@/models/AuditLog";

type AuditLogInput = {
  organizationId: string;
  actorUserId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  level?: "info" | "warning" | "error";
  message: string;
  metadata?: Record<string, unknown>;
};

export async function recordAuditLog(input: AuditLogInput) {
  try {
    await AuditLog.create({
      organizationId: new Types.ObjectId(input.organizationId),
      actorUserId: input.actorUserId ? new Types.ObjectId(input.actorUserId) : null,
      actorName: input.actorName || "",
      actorEmail: input.actorEmail || "",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || "",
      level: input.level || "info",
      message: input.message,
      metadata: input.metadata || {}
    });
  } catch (error) {
    console.error("Failed to record audit log", error);
  }
}
