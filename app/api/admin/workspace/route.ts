import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordAuditLog } from "@/lib/audit-log";
import { connectToDatabase } from "@/lib/mongoose";
import { adminWorkspaceSchema } from "@/lib/validators";
import { slugify } from "@/lib/slugify";
import Organization from "@/models/Organization";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  if (session.user.role !== "owner") {
    return NextResponse.json({ message: "Only owners can manage workspace settings." }, { status: 403 });
  }

  const json = await request.json();
  const parsed = adminWorkspaceSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid workspace update." }, { status: 400 });
  }

  await connectToDatabase();

  const organization = await Organization.findById(session.user.organizationId);
  if (!organization) {
    return NextResponse.json({ message: "Workspace not found." }, { status: 404 });
  }

  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let suffix = 1;

  while (await Organization.findOne({ _id: { $ne: organization._id }, slug }).lean()) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  organization.name = parsed.data.name;
  organization.slug = slug;
  organization.businessProfile = {
    legalName: parsed.data.businessProfile.legalName,
    supportEmail: parsed.data.businessProfile.supportEmail,
    supportPhone: parsed.data.businessProfile.supportPhone,
    website: parsed.data.businessProfile.website
  };
  organization.complianceSettings = {
    defaultPropertyCity: parsed.data.complianceSettings.defaultPropertyCity,
    defaultPropertyState: parsed.data.complianceSettings.defaultPropertyState,
    useClearBackgroundChecksAsPositiveSignal: parsed.data.complianceSettings.useClearBackgroundChecksAsPositiveSignal,
    allowCriminalHistoryScoreImpact: parsed.data.complianceSettings.allowCriminalHistoryScoreImpact,
    allowRegistryScoreImpact: parsed.data.complianceSettings.allowRegistryScoreImpact,
    allowOfacScoreImpact: parsed.data.complianceSettings.allowOfacScoreImpact,
    requireManualReviewForConsumerReportFindings: parsed.data.complianceSettings.requireManualReviewForConsumerReportFindings
  };
  organization.screeningPolicy = {
    minAffordabilityRatio: parsed.data.screeningPolicy.minAffordabilityRatio,
    minResidentScore: parsed.data.screeningPolicy.minResidentScore,
    strongScoreThreshold: parsed.data.screeningPolicy.strongScoreThreshold,
    reviewScoreThreshold: parsed.data.screeningPolicy.reviewScoreThreshold,
    requireIncomeDocs: parsed.data.screeningPolicy.requireIncomeDocs,
    requireGovernmentId: parsed.data.screeningPolicy.requireGovernmentId,
    requireLandlordReference: parsed.data.screeningPolicy.requireLandlordReference
  };
  organization.intakeSettings = {
    enabledSources: parsed.data.intakeSettings.enabledSources,
    duplicatePolicy: parsed.data.intakeSettings.duplicatePolicy
  };
  await organization.save();

  await recordAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    actorName: session.user.name,
    actorEmail: session.user.email,
    action: "workspace.updated",
    entityType: "workspace",
    entityId: String(organization._id),
    message: `Workspace settings updated by ${session.user.email || "owner"}.`,
    metadata: {
      name: organization.name,
      slug: organization.slug
    }
  });

  return NextResponse.json({
    _id: String(organization._id),
    name: organization.name,
    slug: organization.slug,
    plan: organization.plan,
    billingStatus: organization.billingStatus,
    businessProfile: organization.businessProfile,
    complianceSettings: organization.complianceSettings,
    screeningPolicy: organization.screeningPolicy,
    intakeSettings: organization.intakeSettings
  });
}
