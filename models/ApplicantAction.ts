import { Schema, model, models, type InferSchemaType } from "mongoose";

const explainabilityItemSchema = new Schema(
  {
    rule: { type: String, required: true },
    facts: { type: Schema.Types.Mixed, required: true },
    policyThreshold: { type: Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const applicantActionSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "Applicant",
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Action identity
    actionType: {
      type: String,
      required: true,
      index: true,
    },

    // Recommendation details
    title: { type: String, required: true },
    description: { type: String, required: true },
    suggestedAction: { type: String, required: true },
    priority: {
      type: String,
      enum: ["P0", "P1", "P2", "info"],
      required: true,
      index: true,
    },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    maxConfidence: { type: Number, required: true, min: 0, max: 100 },

    // Explainability (immutable audit trail)
    explainability: {
      type: [explainabilityItemSchema],
      default: [],
    },

    // Automation metadata
    automationSafe: { type: Boolean, required: true, default: false },
    automationAvailable: { type: Boolean, required: true, default: false },

    // Human interaction
    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "skipped",
        "overridden",
        "expired",
        "auto_applied",
      ],
      default: "pending",
      index: true,
    },
    actedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actedAt: { type: Date, default: null },
    overrideReason: { type: String, default: null },
    overrideActionTaken: { type: String, default: null },

    // Feedback loop
    outcome: {
      type: String,
      enum: ["positive", "negative", "neutral"],
      default: null,
    },
    outcomeNote: { type: String, default: null },

    // Lifecycle
    generatedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, default: null },
    dismissedAt: { type: Date, default: null },

    // Version tracking
    generationHash: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate pending actions for the same applicant + actionType
applicantActionSchema.index(
  { applicantId: 1, actionType: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
    name: "applicant_action_pending_dedup",
  },
);

applicantActionSchema.index({ organizationId: 1, generatedAt: -1 });
applicantActionSchema.index({ organizationId: 1, applicantId: 1, status: 1 });

export type ApplicantActionDocument = InferSchemaType<
  typeof applicantActionSchema
> & { _id: string };
const ApplicantAction =
  models.ApplicantAction || model("ApplicantAction", applicantActionSchema);

export default ApplicantAction;
