import { Schema, model, models, type InferSchemaType } from "mongoose";

const organizationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    plan: {
      type: String,
      enum: ["starter", "pro"],
      default: "starter"
    },
    billingStatus: {
      type: String,
      enum: ["inactive", "trialing", "active", "past_due"],
      default: "inactive"
    },
    stripeCustomerId: {
      type: String,
      default: ""
    },
    stripeSubscriptionId: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

export type OrganizationDocument = InferSchemaType<typeof organizationSchema> & { _id: string };
const Organization = models.Organization || model("Organization", organizationSchema);

export default Organization;

