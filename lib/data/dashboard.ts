import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import Organization from "@/models/Organization";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";

function serializeApplicant(applicant: Record<string, unknown>): ApplicantRecord {
  return ({
    ...applicant,
    _id: String(applicant._id),
    organizationId: String(applicant.organizationId),
    ownerId: String(applicant.ownerId),
    createdAt: new Date(String(applicant.createdAt)).toISOString(),
    updatedAt: new Date(String(applicant.updatedAt)).toISOString()
  } as unknown) as ApplicantRecord;
}

export async function getDashboardData(userId: string, organizationId: string) {
  await dbConnect();

  const ownerObjectId = new Types.ObjectId(userId);
  const organizationObjectId = new Types.ObjectId(organizationId);

  const [applicants, organization] = await Promise.all([
    Applicant.find({
      ownerId: ownerObjectId,
      organizationId: organizationObjectId
    })
      .sort({ createdAt: -1 })
      .lean(),
    Organization.findById(organizationObjectId).lean()
  ]);

  const normalizedApplicants = applicants.map((item) => serializeApplicant(item));
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
          billingStatus: organization.billingStatus
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

