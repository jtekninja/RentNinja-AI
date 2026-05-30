import { Schema, model, models, type InferSchemaType } from "mongoose";

const applicantDocumentSchema = new Schema(
  {
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "Applicant",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    filename: { type: String, required: true, trim: true },
    fileType: { type: String, default: "", trim: true },
    extractedText: { type: String, default: "" },
    aiSummary: { type: String, default: "" },
  },
  { timestamps: true },
);

export type ApplicantDocumentRecord = InferSchemaType<
  typeof applicantDocumentSchema
> & { _id: string };

const ApplicantDocument =
  models.ApplicantDocument ||
  model("ApplicantDocument", applicantDocumentSchema);

export default ApplicantDocument;
