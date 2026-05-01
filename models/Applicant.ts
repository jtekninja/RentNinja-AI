import { Schema, model, models, type InferSchemaType } from "mongoose";

const coApplicantSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      default: "",
      trim: true
    },
    monthlyIncome: {
      type: Number,
      required: true,
      default: 0
    },
    residentScore: {
      type: Number,
      required: true,
      default: 0
    },
    notes: {
      type: String,
      default: "",
      trim: true
    }
  },
  {
    _id: false
  }
);

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
    propertyAddress: {
      type: String,
      default: "",
      trim: true
    },
    propertyCity: {
      type: String,
      default: "",
      trim: true
    },
    propertyState: {
      type: String,
      default: "",
      trim: true
    },
    propertyPostalCode: {
      type: String,
      default: "",
      trim: true
    },
    moveInDate: {
      type: String,
      default: "",
      trim: true
    },
    coApplicants: {
      type: [coApplicantSchema],
      default: []
    },
    duplicateFingerprint: {
      type: String,
      trim: true
    },
    duplicateDayKey: {
      type: String,
      trim: true
    },
    applicationSource: {
      type: String,
      enum: ["Apartments.com", "Zillow", "TurboTenant", "RentSpree", "Avail", "Email / Manual", "Other"],
      default: "Email / Manual",
      index: true
    },
    monthlyRent: {
      type: Number,
      required: true
    },
    monthlyIncome: {
      type: Number,
      required: true
    },
    housingSupport: {
      type: String,
      enum: ["None", "Voucher", "Subsidy"],
      default: "None"
    },
    supportProgram: {
      type: String,
      trim: true,
      default: ""
    },
    monthlySubsidyAmount: {
      type: Number,
      required: true,
      default: 0
    },
    tenantPortionRent: {
      type: Number,
      required: true,
      default: 0
    },
    subsidyStatus: {
      type: String,
      enum: ["N/A", "Pending", "Verified"],
      default: "N/A"
    },
    inspectionStatus: {
      type: String,
      enum: ["N/A", "Pending", "Passed", "Failed"],
      default: "N/A"
    },
    creditScore: {
      type: Number,
      required: true,
      default: 0
    },
    residentScore: {
      type: Number,
      required: true,
      default: 0
    },
    scores: {
      income: { type: Number, required: true },
      credit: { type: Number, required: true },
      resident: { type: Number, required: true, default: 0 },
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
    responsibleRent: {
      type: Number,
      required: true,
      default: 0
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

applicantSchema.index({ organizationId: 1, createdAt: -1 });
applicantSchema.index(
  {
    organizationId: 1,
    duplicateFingerprint: 1
  },
  {
    unique: true,
    sparse: true,
    name: "applicant_person_duplicate_guard"
  }
);

export type ApplicantDocument = InferSchemaType<typeof applicantSchema> & { _id: string };
const Applicant = models.Applicant || model("Applicant", applicantSchema);

export default Applicant;
