import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { ApplicantDetailClient } from "@/components/dashboard/applicant-detail-client";
import { serializeApplicantRecord } from "@/lib/applicant-serialization";
import { getApplicantIntelligence } from "@/lib/applicant-intelligence";
import { getNextBestAction } from "@/lib/next-best-action";
import { dbConnect } from "@/lib/mongodb";
import { requireSession } from "@/lib/require-session";
import Applicant from "@/models/Applicant";
import Property from "@/models/Property";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const applicant = await Applicant.findOne({
    _id: new Types.ObjectId(id),
    organizationId: new Types.ObjectId(session.user.organizationId),
  }).lean();

  if (!applicant) notFound();

  const property =
    applicant.propertyId && Types.ObjectId.isValid(String(applicant.propertyId))
      ? await Property.findOne({
          _id: new Types.ObjectId(String(applicant.propertyId)),
          organizationId: new Types.ObjectId(session.user.organizationId),
        }).lean()
      : null;

  const propertyFinancials = property as
    | { monthlyRent?: unknown; securityDepositMonths?: unknown; requireFirstMonthAtSigning?: unknown }
    | null;

  const record = serializeApplicantRecord(
    applicant,
    {
      propertyMonthlyRent: propertyFinancials ? Number(propertyFinancials.monthlyRent ?? 0) || null : null,
      securityDepositMonths: propertyFinancials ? Number(propertyFinancials.securityDepositMonths ?? 1) || 1 : 1,
      requireFirstMonthAtSigning: propertyFinancials?.requireFirstMonthAtSigning !== false,
    },
  ) as unknown as ApplicantRecord;
  const intel = getApplicantIntelligence(record);
  const nextAction = getNextBestAction(record, intel);

  return (
    <WorkspacePageShell
      eyebrow="Applicant"
      title={record.name}
      description={`${intel.readiness}% ready | Score ${intel.score}/100 | ${intel.riskLevel} risk`}
    >
      <ApplicantDetailClient
        record={record}
        intel={intel}
        nextAction={nextAction}
      />
    </WorkspacePageShell>
  );
}
