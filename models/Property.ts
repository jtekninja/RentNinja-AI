import { Schema, model, models, type InferSchemaType } from "mongoose";

const propertySchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "", trim: true },
    unitCount: { type: Number, default: 1 },
    propertyType: { type: String, default: "Apartment", trim: true },
    monthlyRent: { type: Number, default: 0 },
    securityDepositMonths: { type: Number, default: 1 },
    requireFirstMonthAtSigning: { type: Boolean, default: true },
    utilitiesIncluded: { type: Boolean, default: false },
    maxOccupancy: { type: Number, default: 0 },
    petPolicy: { type: String, default: "", trim: true },
    smokingPolicy: { type: String, default: "", trim: true },
    requiredDocuments: { type: [String], default: [] },
    screeningCriteria: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

propertySchema.index({ organizationId: 1, name: 1 });

export type PropertyDocument = InferSchemaType<typeof propertySchema> & {
  _id: string;
};

const Property = models.Property || model("Property", propertySchema);

export default Property;
