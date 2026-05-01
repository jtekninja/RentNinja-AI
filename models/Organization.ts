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
    },
    businessProfile: {
      legalName: {
        type: String,
        default: "",
        trim: true
      },
      supportEmail: {
        type: String,
        default: "",
        trim: true,
        lowercase: true
      },
      supportPhone: {
        type: String,
        default: "",
        trim: true
      },
      website: {
        type: String,
        default: "",
        trim: true
      }
    },
    complianceSettings: {
      defaultPropertyCity: {
        type: String,
        default: "NYC",
        trim: true
      },
      defaultPropertyState: {
        type: String,
        default: "NY",
        trim: true
      },
      useClearBackgroundChecksAsPositiveSignal: {
        type: Boolean,
        default: true
      },
      allowCriminalHistoryScoreImpact: {
        type: Boolean,
        default: false
      },
      allowRegistryScoreImpact: {
        type: Boolean,
        default: false
      },
      allowOfacScoreImpact: {
        type: Boolean,
        default: false
      },
      requireManualReviewForConsumerReportFindings: {
        type: Boolean,
        default: true
      }
    },
    screeningPolicy: {
      minAffordabilityRatio: {
        type: Number,
        default: 2.5
      },
      minResidentScore: {
        type: Number,
        default: 560
      },
      strongScoreThreshold: {
        type: Number,
        default: 80
      },
      reviewScoreThreshold: {
        type: Number,
        default: 60
      },
      requireIncomeDocs: {
        type: Boolean,
        default: true
      },
      requireGovernmentId: {
        type: Boolean,
        default: true
      },
      requireLandlordReference: {
        type: Boolean,
        default: true
      }
    },
    intakeSettings: {
      enabledSources: {
        type: [String],
        default: ["Apartments.com", "Zillow", "TurboTenant", "RentSpree", "Avail", "Email / Manual", "Other"]
      },
      duplicatePolicy: {
        type: String,
        enum: ["block", "warn"],
        default: "block"
      }
    }
  },
  {
    timestamps: true
  }
);

export type OrganizationDocument = InferSchemaType<typeof organizationSchema> & { _id: string };
const Organization = models.Organization || model("Organization", organizationSchema);

export default Organization;
