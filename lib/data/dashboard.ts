import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { serializeApplicantRecord } from "@/lib/applicant-serialization";
import Applicant from "@/models/Applicant";
import Organization from "@/models/Organization";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";

export async function getDashboardData(userId: string, organizationId: string) {
  await dbConnect();

  const organizationObjectId = new Types.ObjectId(organizationId);

  const [applicants, organization] = await Promise.all([
    Applicant.find({
      organizationId: organizationObjectId
    })
      .sort({ createdAt: -1 })
      .lean(),
    Organization.findById(organizationObjectId).lean()
  ]);

  const normalizedApplicants = applicants.map((item) => serializeApplicantRecord(item) as unknown as ApplicantRecord);
  const strong = normalizedApplicants.filter((item) => item.decision === "Strong").length;
  const review = normalizedApplicants.filter((item) => item.decision === "Review").length;
  const risk = normalizedApplicants.filter((item) => item.decision === "Risk").length;
  const avgScore =
    normalizedApplicants.length > 0
      ? Math.round(normalizedApplicants.reduce((sum, item) => sum + Number(item.totalScore), 0) / normalizedApplicants.length)
      : 0;

  return {
    organization: organization
      ? {
          _id: String(organization._id),
          name: organization.name,
          plan: organization.plan,
          billingStatus: organization.billingStatus,
          hasBillingCustomer: Boolean(organization.stripeCustomerId),
          complianceSettings: {
            defaultPropertyCity: organization.complianceSettings?.defaultPropertyCity || "NYC",
            defaultPropertyState: organization.complianceSettings?.defaultPropertyState || "NY"
          }
        }
      : null,
    applicants: normalizedApplicants,
    summary: {
      total: normalizedApplicants.length,
      strong,
      review,
      risk,
      avgScore
    }
  };
}
