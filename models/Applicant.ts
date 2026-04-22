import { Schema, model, models, type InferSchemaType } from "mongoose";

const applicantSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    monthlyRent: {
      type: Number,
      required: true
    },
    monthlyIncome: {
      type: Number,
      required: true
    },
    creditScore: {
      type: Number,
      required: true
    },
    scores: {
      income: { type: Number, required: true },
      credit: { type: Number, required: true },
      rentalHistory: { type: Number, required: true },
      rulesCompliance: { type: Number, required: true },
      timeline: { type: Number, required: true },
      communication: { type: Number, required: true },
      documentation: { type: Number, required: true }
    },
    totalScore: {
      type: Number,
      required: true,
      index: true
    },
    decision: {
      type: String,
      enum: ["Strong", "Review", "Risk"],
      required: true,
      index: true
    },
    affordabilityRatio: {
      type: Number,
      required: true
    },
    redFlags: {
      type: [String],
      default: []
    },
    notes: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ["New", "Screening", "Approved", "Review", "Rejected"],
      default: "New",
      index: true
    }
  },
  {
    timestamps: true
  }
);

applicantSchema.index({ ownerId: 1, createdAt: -1 });

export type ApplicantDocument = InferSchemaType<typeof applicantSchema> & { _id: string };
const Applicant = models.Applicant || model("Applicant", applicantSchema);

export default Applicant;

