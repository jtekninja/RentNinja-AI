import { Schema, model, models, type InferSchemaType } from "mongoose";

const workspaceMemberSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member", "viewer"],
      default: "member",
    },
  },
  { timestamps: true },
);

workspaceMemberSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true },
);

export type WorkspaceMemberDocument = InferSchemaType<
  typeof workspaceMemberSchema
> & { _id: string };

const WorkspaceMember =
  models.WorkspaceMember || model("WorkspaceMember", workspaceMemberSchema);

export default WorkspaceMember;
