import { Schema, model, models } from "mongoose";

const processedWebhookSchema = new Schema(
  {
    stripeEventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
      index: { expires: "30d" },
    },
  },
  {
    collection: "processed_webhooks",
    timestamps: false,
  },
);

const ProcessedWebhook =
  models.ProcessedWebhook || model("ProcessedWebhook", processedWebhookSchema);

export default ProcessedWebhook;
