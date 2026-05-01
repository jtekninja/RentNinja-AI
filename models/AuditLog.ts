import { Schema, model, models, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    actorName: {
      type: String,
      default: "",
      trim: true
    },
    actorEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      default: "",
      index: true
    },
    level: {
      type: String,
      enum: ["info", "warning", "error"],
      default: "info",
      index: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema> & { _id: string };
const AuditLog = models.AuditLog || model("AuditLog", auditLogSchema);

export default AuditLog;
