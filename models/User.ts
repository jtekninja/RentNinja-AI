import { Schema, model, models, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },
    emailVerified: {
      type: Date,
      default: null
    },
    image: {
      type: String,
      default: null
    },
    passwordHash: {
      type: String,
      required: true
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ["owner", "member"],
      default: "owner"
    }
  },
  {
    collection: "users",
    timestamps: true
  }
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: string };
const User = models.User || model("User", userSchema);

export default User;
