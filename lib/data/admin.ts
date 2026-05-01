import { Types } from "mongoose";
import AuditLog from "@/models/AuditLog";
import { dbConnect } from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import Organization from "@/models/Organization";
import User from "@/models/User";

export type AdminWorkspaceData = {
  organization: {
    _id: string;
    name: string;
    slug: string;
    plan: string;
    billingStatus: string;
    createdAt: string;
    businessProfile: {
      legalName: string;
      supportEmail: string;
      supportPhone: string;
      website: string;
    };
    complianceSettings: {
      defaultPropertyCity: string;
      defaultPropertyState: string;
      useClearBackgroundChecksAsPositiveSignal: boolean;
      allowCriminalHistoryScoreImpact: boolean;
      allowRegistryScoreImpact: boolean;
      allowOfacScoreImpact: boolean;
      requireManualReviewForConsumerReportFindings: boolean;
    };
    screeningPolicy: {
      minAffordabilityRatio: number;
      minResidentScore: number;
      strongScoreThreshold: number;
      reviewScoreThreshold: number;
      requireIncomeDocs: boolean;
      requireGovernmentId: boolean;
      requireLandlordReference: boolean;
    };
    intakeSettings: {
      enabledSources: string[];
      duplicatePolicy: "block" | "warn";
    };
  };
  stats: {
    applicants: number;
    strong: number;
    review: number;
    risk: number;
    teamMembers: number;
  };
  users: Array<{
    _id: string;
    name: string;
    email: string;
    username: string;
    role: "owner" | "member";
    createdAt: string;
  }>;
  activity: Array<{
    _id: string;
    action: string;
    entityType: string;
    entityId: string;
    level: "info" | "warning" | "error";
    message: string;
    actorName: string;
    actorEmail: string;
    createdAt: string;
  }>;
};

export async function getAdminData(organizationId: string): Promise<AdminWorkspaceData | null> {
  await dbConnect();

  const organizationObjectId = new Types.ObjectId(organizationId);
  const [organization, users, applicantStats, activity] = await Promise.all([
    Organization.findById(organizationObjectId).lean(),
    User.find({ organizationId: organizationObjectId }).sort({ createdAt: 1 }).lean(),
    Applicant.aggregate([
      { $match: { organizationId: organizationObjectId } },
      {
        $group: {
          _id: null,
          applicants: { $sum: 1 },
          strong: { $sum: { $cond: [{ $eq: ["$decision", "Strong"] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ["$decision", "Review"] }, 1, 0] } },
          risk: { $sum: { $cond: [{ $eq: ["$decision", "Risk"] }, 1, 0] } }
        }
      }
    ]),
    AuditLog.find({ organizationId: organizationObjectId }).sort({ createdAt: -1 }).limit(40).lean()
  ]);

  if (!organization) {
    return null;
  }

  return {
    organization: {
      _id: String(organization._id),
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      billingStatus: organization.billingStatus,
      createdAt: new Date(String(organization.createdAt)).toISOString(),
      businessProfile: {
        legalName: organization.businessProfile?.legalName || "",
        supportEmail: organization.businessProfile?.supportEmail || "",
        supportPhone: organization.businessProfile?.supportPhone || "",
        website: organization.businessProfile?.website || ""
      },
      complianceSettings: {
        defaultPropertyCity: organization.complianceSettings?.defaultPropertyCity || "NYC",
        defaultPropertyState: organization.complianceSettings?.defaultPropertyState || "NY",
        useClearBackgroundChecksAsPositiveSignal: organization.complianceSettings?.useClearBackgroundChecksAsPositiveSignal ?? true,
        allowCriminalHistoryScoreImpact: organization.complianceSettings?.allowCriminalHistoryScoreImpact ?? false,
        allowRegistryScoreImpact: organization.complianceSettings?.allowRegistryScoreImpact ?? false,
        allowOfacScoreImpact: organization.complianceSettings?.allowOfacScoreImpact ?? false,
        requireManualReviewForConsumerReportFindings: organization.complianceSettings?.requireManualReviewForConsumerReportFindings ?? true
      },
      screeningPolicy: {
        minAffordabilityRatio: organization.screeningPolicy?.minAffordabilityRatio ?? 2.5,
        minResidentScore: organization.screeningPolicy?.minResidentScore ?? 560,
        strongScoreThreshold: organization.screeningPolicy?.strongScoreThreshold ?? 80,
        reviewScoreThreshold: organization.screeningPolicy?.reviewScoreThreshold ?? 60,
        requireIncomeDocs: organization.screeningPolicy?.requireIncomeDocs ?? true,
        requireGovernmentId: organization.screeningPolicy?.requireGovernmentId ?? true,
        requireLandlordReference: organization.screeningPolicy?.requireLandlordReference ?? true
      },
      intakeSettings: {
        enabledSources: organization.intakeSettings?.enabledSources?.length
          ? organization.intakeSettings.enabledSources
          : ["Apartments.com", "Zillow", "TurboTenant", "RentSpree", "Avail", "Email / Manual", "Other"],
        duplicatePolicy: organization.intakeSettings?.duplicatePolicy === "warn" ? "warn" : "block"
      }
    },
    stats: {
      applicants: applicantStats[0]?.applicants ?? 0,
      strong: applicantStats[0]?.strong ?? 0,
      review: applicantStats[0]?.review ?? 0,
      risk: applicantStats[0]?.risk ?? 0,
      teamMembers: users.length
    },
    users: users.map((user) => ({
      _id: String(user._id),
      name: user.name,
      email: user.email,
      username: user.username || "",
      role: user.role,
      createdAt: new Date(String(user.createdAt)).toISOString()
    })),
    activity: activity.map((entry) => ({
      _id: String(entry._id),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || "",
      level: entry.level,
      message: entry.message,
      actorName: entry.actorName || "",
      actorEmail: entry.actorEmail || "",
      createdAt: new Date(String(entry.createdAt)).toISOString()
    }))
  };
}
