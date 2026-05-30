import { Schema, model, models, type InferSchemaType } from "mongoose";

const billingEventSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    stripeEventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

export type BillingEventDocument = InferSchemaType<typeof billingEventSchema> & {
  _id: string;
};

const BillingEvent =
  models.BillingEvent || model("BillingEvent", billingEventSchema);

export default BillingEvent;
