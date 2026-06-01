import { Schema, model, models, type InferSchemaType } from "mongoose";
import { applicantStatusValues } from "@/lib/applicant-status";

const coApplicantSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    monthlyIncome: {
      type: Number,
      required: true,
      default: 0,
    },
    residentScore: {
      type: Number,
      required: true,
      default: 0,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const applicantSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    propertyAddress: {
      type: String,
      default: "",
      trim: true,
    },
    propertyUnit: {
      type: String,
      default: "",
      trim: true,
    },
    propertyNickname: {
      type: String,
      default: "",
      trim: true,
    },
    borough: {
      type: String,
      default: "",
      trim: true,
    },
    neighborhood: {
      type: String,
      default: "",
      trim: true,
    },
    utilitiesIncluded: {
      type: Boolean,
      default: false,
    },
    bedrooms: {
      type: Number,
      default: null,
    },
    bathrooms: {
      type: Number,
      default: null,
    },
    propertyMonthlyRent: {
      type: Number,
      default: 0,
    },
    rentSource: {
      type: String,
      default: "",
      trim: true,
    },
    incomeSource: {
      type: String,
      default: "",
      trim: true,
    },
    dueAtSigningSource: {
      type: String,
      default: "",
      trim: true,
    },
    securityDepositMonths: {
      type: Number,
      default: 1,
    },
    requireFirstMonthAtSigning: {
      type: Boolean,
      default: true,
    },
    financialFieldsCorrected: {
      type: Boolean,
      default: false,
    },
    financialCorrectionNote: {
      type: String,
      default: "",
      trim: true,
    },
    propertyCity: {
      type: String,
      default: "",
      trim: true,
    },
    propertyState: {
      type: String,
      default: "",
      trim: true,
    },
    propertyPostalCode: {
      type: String,
      default: "",
      trim: true,
    },
    moveInDate: {
      type: String,
      default: "",
      trim: true,
    },
    coApplicants: {
      type: [coApplicantSchema],
      default: [],
    },
    duplicateFingerprint: {
      type: String,
      trim: true,
    },
    duplicateDayKey: {
      type: String,
      trim: true,
    },
    applicationSource: {
      type: String,
      enum: [
        "Apartments.com",
        "Zillow",
        "TurboTenant",
        "RentSpree",
        "Avail",
        "Email / Manual",
        "Other",
      ],
      default: "Email / Manual",
      index: true,
    },
    monthlyRent: {
      type: Number,
      required: true,
    },
    monthlyIncome: {
      type: Number,
      required: true,
    },
    dueAtSigning: {
      type: Number,
      required: true,
      default: 0,
    },
    securityDeposit: {
      type: Number,
      required: true,
      default: 0,
    },
    firstMonthRent: {
      type: Number,
      default: 0,
    },
    brokerFee: {
      type: Number,
      default: 0,
    },
    petFee: {
      type: Number,
      default: 0,
    },
    otherMoveInFees: {
      type: Number,
      default: 0,
    },
    dueAtSigningAmount: {
      type: Number,
      default: 0,
    },
    dueAtSigningRawText: {
      type: String,
      default: "",
      trim: true,
    },
    dueAtSigningNeedsConfirmation: {
      type: Boolean,
      default: false,
    },
    applicantGrossMonthlyIncome: {
      type: Number,
      default: null,
    },
    applicantAnnualIncome: {
      type: Number,
      default: null,
    },
    applicantIncomeAmount: {
      type: Number,
      default: null,
    },
    applicantIncomeFrequency: {
      type: String,
      enum: ["hourly", "weekly", "biweekly", "monthly", "yearly", "unknown"],
      default: "unknown",
    },
    tenantPortion: {
      type: Number,
      default: 0,
    },
    voucherPortion: {
      type: Number,
      default: 0,
    },
    securityDepositAmount: {
      type: Number,
      default: 0,
    },
    firstMonthRentAmount: {
      type: Number,
      default: 0,
    },
    incomeAmount: {
      type: Number,
      default: null,
    },
    incomeFrequency: {
      type: String,
      enum: ["hourly", "weekly", "biweekly", "monthly", "yearly", "unknown"],
      default: "unknown",
    },
    normalizedMonthlyIncome: {
      type: Number,
      default: null,
    },
    incomeToRentRatio: {
      type: Number,
      default: null,
    },
    housingSupport: {
      type: String,
      enum: ["None", "Voucher", "Subsidy"],
      default: "None",
    },
    supportProgram: {
      type: String,
      trim: true,
      default: "",
    },
    monthlySubsidyAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    tenantPortionRent: {
      type: Number,
      required: true,
      default: 0,
    },
    subsidyStatus: {
      type: String,
      enum: ["N/A", "Pending", "Verified"],
      default: "N/A",
    },
    inspectionStatus: {
      type: String,
      enum: ["N/A", "Pending", "Passed", "Failed"],
      default: "N/A",
    },
    creditScore: {
      type: Number,
      required: true,
      default: 0,
    },
    residentScore: {
      type: Number,
      required: true,
      default: 0,
    },
    scores: {
      income: { type: Number, required: true },
      credit: { type: Number, required: true },
      resident: { type: Number, required: true, default: 0 },
      rentalHistory: { type: Number, required: true },
      rulesCompliance: { type: Number, required: true },
      timeline: { type: Number, required: true },
      communication: { type: Number, required: true },
      documentation: { type: Number, required: true },
    },
    totalScore: {
      type: Number,
      required: true,
      index: true,
    },
    decision: {
      type: String,
      enum: ["Strong", "Review", "Risk"],
      required: true,
      index: true,
    },
    affordabilityRatio: {
      type: Number,
      required: true,
    },
    responsibleRent: {
      type: Number,
      required: true,
      default: 0,
    },
    redFlags: {
      type: [String],
      default: [],
    },
    aiSummary: {
      type: String,
      default: "",
    },
    aiRedFlags: {
      type: [String],
      default: [],
    },
    aiStrengths: {
      type: [String],
      default: [],
    },
    aiRecommendation: {
      type: String,
      default: "",
    },
    aiRecommendedStatus: {
      type: String,
      default: "",
      trim: true,
    },
    rawText: {
      type: String,
      default: "",
      trim: true,
    },
    rawPastedText: {
      type: String,
      default: "",
      trim: true,
    },
    sourceText: {
      type: String,
      default: "",
      trim: true,
    },
    extractedDocumentText: {
      type: String,
      default: "",
      trim: true,
    },
    documentExtracts: {
      type: String,
      default: "",
      trim: true,
    },
    suggestedMessage: {
      type: String,
      default: "",
      trim: true,
    },
    extractedFieldSummary: {
      type: String,
      default: "",
      trim: true,
    },
    missingDocuments: {
      type: [String],
      default: [],
    },
    receivedDocuments: {
      type: [String],
      default: [],
    },
    followUpQuestions: {
      type: [String],
      default: [],
    },
    importantNotes: {
      type: [String],
      default: [],
    },
    extractedFields: {
      type: Schema.Types.Mixed,
      default: {},
    },
    uploadedFiles: {
      type: [
        new Schema(
          {
            filename: { type: String, required: true, trim: true },
            type: { type: String, default: "", trim: true },
            size: { type: Number, default: 0 },
            uploadedAt: { type: String, default: "", trim: true },
            extractionStatus: { type: String, default: "not_attempted", trim: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    updateHistory: {
      type: [
        new Schema(
          {
            updatedAt: { type: String, required: true, trim: true },
            sourceText: { type: String, default: "", trim: true },
            fieldsChanged: {
              type: [
                new Schema(
                  {
                    field: { type: String, required: true, trim: true },
                    label: { type: String, required: true, trim: true },
                    oldValue: { type: Schema.Types.Mixed, default: null },
                    newValue: { type: Schema.Types.Mixed, default: null },
                    confidence: {
                      type: String,
                      enum: ["Low", "Medium", "High"],
                      default: "Medium",
                    },
                    reason: { type: String, default: "", trim: true },
                  },
                  { _id: false },
                ),
              ],
              default: [],
            },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    nextStep: {
      type: String,
      default: "",
      trim: true,
    },
    confidenceLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    confidenceReason: {
      type: String,
      default: "",
      trim: true,
    },
    readiness: {
      type: Number,
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    notes: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: applicantStatusValues,
      default: "New",
      index: true,
    },
    lastActionAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

applicantSchema.index({ organizationId: 1, createdAt: -1 });
applicantSchema.index(
  {
    organizationId: 1,
    duplicateFingerprint: 1,
  },
  {
    unique: true,
    sparse: true,
    name: "applicant_person_duplicate_guard",
  },
);

export type ApplicantDocument = InferSchemaType<typeof applicantSchema> & {
  _id: string;
};
const Applicant = models.Applicant || model("Applicant", applicantSchema);

export default Applicant;
