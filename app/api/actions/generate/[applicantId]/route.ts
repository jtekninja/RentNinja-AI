import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Applicant from "@/models/Applicant";
import Organization from "@/models/Organization";
import ApplicantAction from "@/models/ApplicantAction";
import {
  generateActionsForApplicant,
  computeGenerationHash,
  computePipelineStats,
} from "@/lib/action-engine";
import { computeHistoricalAccuracy } from "@/lib/feedback-engine";
import type { ActionContext } from "@/lib/action-engine";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import { recordAuditLog } from "@/lib/audit-log";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const GEN_LIMIT = { limit: 30, windowMs: 60_000, label: "action-generate" };

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function applicantToRecord(doc: Record<string, unknown>): ApplicantRecord {
  return {
    _id: String(doc._id),
    name: String(doc.name ?? ""),
    email: String(doc.email ?? ""),
    phone: String(doc.phone ?? ""),
    propertyAddress: String(doc.propertyAddress ?? ""),
    propertyCity: String(doc.propertyCity ?? ""),
    propertyState: String(doc.propertyState ?? ""),
    propertyPostalCode: String(doc.propertyPostalCode ?? ""),
    moveInDate: String(doc.moveInDate ?? ""),
    coApplicants: Array.isArray(doc.coApplicants)
      ? doc.coApplicants.map((c: Record<string, unknown>) => ({
          name: String(c.name ?? ""),
          email: String(c.email ?? ""),
          phone: String(c.phone ?? ""),
          monthlyIncome: Number(c.monthlyIncome ?? 0),
          residentScore: Number(c.residentScore ?? 0),
          notes: String(c.notes ?? ""),
        }))
      : [],
    applicationSource: String(doc.applicationSource ?? "Email / Manual"),
    monthlyRent: Number(doc.monthlyRent ?? 0),
    monthlyIncome: Number(doc.monthlyIncome ?? 0),
    housingSupport:
      (doc.housingSupport as ApplicantRecord["housingSupport"]) ?? "None",
    supportProgram: String(doc.supportProgram ?? ""),
    monthlySubsidyAmount: Number(doc.monthlySubsidyAmount ?? 0),
    tenantPortionRent: Number(doc.tenantPortionRent ?? 0),
    subsidyStatus:
      (doc.subsidyStatus as ApplicantRecord["subsidyStatus"]) ?? "N/A",
    inspectionStatus:
      (doc.inspectionStatus as ApplicantRecord["inspectionStatus"]) ?? "N/A",
    residentScore: Number(doc.residentScore ?? 0),
    duplicateFingerprint: String(doc.duplicateFingerprint ?? ""),
    duplicateDayKey: String(doc.duplicateDayKey ?? ""),
    scores: {
      income: Number((doc.scores as Record<string, unknown>)?.income ?? 0),
      credit: Number((doc.scores as Record<string, unknown>)?.credit ?? 0),
      resident: Number((doc.scores as Record<string, unknown>)?.resident ?? 0),
      rentalHistory: Number(
        (doc.scores as Record<string, unknown>)?.rentalHistory ?? 0,
      ),
      rulesCompliance: Number(
        (doc.scores as Record<string, unknown>)?.rulesCompliance ?? 0,
      ),
      timeline: Number((doc.scores as Record<string, unknown>)?.timeline ?? 0),
      communication: Number(
        (doc.scores as Record<string, unknown>)?.communication ?? 0,
      ),
      documentation: Number(
        (doc.scores as Record<string, unknown>)?.documentation ?? 0,
      ),
    },
    totalScore: Number(doc.totalScore ?? 0),
    affordabilityRatio: Number(doc.affordabilityRatio ?? 0),
    responsibleRent: Number(doc.responsibleRent ?? 0),
    decision: (doc.decision as ApplicantRecord["decision"]) ?? "Review",
    redFlags: Array.isArray(doc.redFlags) ? doc.redFlags.map(String) : [],
    notes: Array.isArray(doc.notes) ? doc.notes.map(String) : [],
    status: (doc.status as ApplicantRecord["status"]) ?? "New",
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt ?? ""),
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ applicantId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const rateCheck = checkRateLimit(request, GEN_LIMIT, session.user.id);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck);

  const { applicantId } = await context.params;

  await dbConnect();

  // Fetch the applicant
  const applicantDoc = await Applicant.findOne({
    _id: new Types.ObjectId(applicantId),
    organizationId: new Types.ObjectId(session.user.organizationId),
  }).lean();

  if (!applicantDoc) {
    return NextResponse.json(
      { message: "Applicant not found." },
      { status: 404 },
    );
  }

  // Fetch organization settings
  const org = await Organization.findById(session.user.organizationId)
    .select("screeningPolicy automationSettings")
    .lean();

  // Fetch all applicants in org for pipeline context
  const allApplicants = await Applicant.find({
    organizationId: new Types.ObjectId(session.user.organizationId),
  })
    .select("_id status decision updatedAt")
    .lean();

  const applicantRecords = allApplicants.map((doc) =>
    applicantToRecord(doc as unknown as Record<string, unknown>),
  );

  // Fetch existing pending actions for this applicant (for dedup)
  const existingActions = await ApplicantAction.find({
    applicantId: new Types.ObjectId(applicantId),
    status: "pending",
  }).lean();

  const previousActionIds = new Set(
    existingActions.map((a) => `${applicantId}:${a.actionType}:${a.status}`),
  );

  // Build context
  const applicant = applicantRecords.find((a) => a._id === applicantId);
  if (!applicant) {
    return NextResponse.json(
      { message: "Applicant not found in records." },
      { status: 404 },
    );
  }

  const ctx: ActionContext = {
    organizationId: session.user.organizationId,
    ownerId: session.user.id,
    screeningPolicy: (org?.screeningPolicy ?? {
      minAffordabilityRatio: 2.5,
      minResidentScore: 560,
      strongScoreThreshold: 80,
      reviewScoreThreshold: 60,
      requireIncomeDocs: true,
      requireGovernmentId: true,
      requireLandlordReference: true,
    }) as ActionContext["screeningPolicy"],
    automationSettings: (org?.automationSettings ?? {
      autoStatusEnabled: false,
      autoStatusMinConfidence: 90,
      autoApproveEnabled: false,
      autoArchiveAfterDays: 90,
      actionExpiryDays: 7,
    }) as ActionContext["automationSettings"],
    allApplicants: applicantRecords,
    allApplicantIds: new Set(applicantRecords.map((a) => a._id)),
    previousActionIds,
    pipelineStats: computePipelineStats(applicantRecords),
  };

  // Compute historical accuracy for confidence calibration
  const historicalAccuracyMap = await computeHistoricalAccuracy(
    session.user.organizationId,
  );

  // Generate actions
  const suggestions = generateActionsForApplicant(
    applicant,
    ctx,
    historicalAccuracyMap,
  );

  if (suggestions.length === 0) {
    return NextResponse.json({ actions: [] });
  }

  // Upsert into database
  const savedActions = [];
  const now = new Date();
  const expiryMs = ctx.automationSettings.actionExpiryDays * 86_400_000;

  for (const s of suggestions) {
    const generationHash = computeGenerationHash(applicant, ctx);

    const actionDoc = await ApplicantAction.findOneAndUpdate(
      {
        applicantId: new Types.ObjectId(applicantId),
        actionType: s.actionType,
        status: "pending",
      },
      {
        $setOnInsert: {
          organizationId: new Types.ObjectId(session.user.organizationId),
          applicantId: new Types.ObjectId(applicantId),
          ownerId: new Types.ObjectId(session.user.id),
          actionType: s.actionType,
          generatedAt: now,
          generationHash,
        },
        $set: {
          title: s.title,
          description: s.description,
          suggestedAction: s.suggestedAction,
          priority: s.priority,
          confidence: s.confidence,
          maxConfidence: s.maxConfidence,
          explainability: s.explainability,
          automationSafe: s.automationSafe,
          automationAvailable: s.automationAvailable,
          expiresAt: new Date(now.getTime() + expiryMs),
        },
      },
      { upsert: true, new: true },
    ).lean();

    savedActions.push(actionDoc);
  }

  // Update applicant's lastActionAt
  await Applicant.findByIdAndUpdate(applicantId, {
    $set: { lastActionAt: now },
  });

  await recordAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    actorName: session.user.name,
    actorEmail: session.user.email,
    action: "actions.generated",
    entityType: "applicant",
    entityId: applicantId,
    message: `Generated ${savedActions.length} action(s) for ${applicant.name}.`,
    metadata: {
      actionCount: savedActions.length,
      actionTypes: savedActions.map((a) => a.actionType),
    },
  });

  return NextResponse.json({ actions: savedActions });
}
