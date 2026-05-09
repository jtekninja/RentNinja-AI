import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import ApplicantAction from "@/models/ApplicantAction";
import Applicant from "@/models/Applicant";
import { recordAuditLog } from "@/lib/audit-log";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const ACT_LIMIT = { limit: 60, windowMs: 60_000, label: "action-act" };

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const { actionId } = await context.params;
  await dbConnect();

  const action = await ApplicantAction.findOne({
    _id: new Types.ObjectId(actionId),
    organizationId: new Types.ObjectId(session.user.organizationId),
  }).lean();

  if (!action) {
    return NextResponse.json({ message: "Action not found." }, { status: 404 });
  }

  return NextResponse.json(action);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const rateCheck = checkRateLimit(request, ACT_LIMIT, session.user.id);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck);

  const { actionId } = await context.params;

  let body: {
    outcome: "accepted" | "skipped" | "overridden";
    overrideReason?: string;
    overrideActionTaken?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!["accepted", "skipped", "overridden"].includes(body.outcome)) {
    return NextResponse.json(
      { message: "Outcome must be one of: accepted, skipped, overridden." },
      { status: 400 },
    );
  }

  await dbConnect();

  const action = await ApplicantAction.findOne({
    _id: new Types.ObjectId(actionId),
    organizationId: new Types.ObjectId(session.user.organizationId),
  });

  if (!action) {
    return NextResponse.json({ message: "Action not found." }, { status: 404 });
  }

  if (action.status !== "pending") {
    return NextResponse.json(
      { message: `Action is already ${action.status}.` },
      { status: 409 },
    );
  }

  const now = new Date();

  // If accepted and automation is available, apply the state change
  if (body.outcome === "accepted" && action.automationAvailable) {
    // Apply automation based on action type
    if (action.actionType === "intake_applicant") {
      await Applicant.findByIdAndUpdate(action.applicantId, {
        $set: { status: "Screening", lastActionAt: now },
      });
    } else if (action.actionType === "archive_applicant") {
      await Applicant.findByIdAndUpdate(action.applicantId, {
        $set: { status: "Rejected", lastActionAt: now },
      });
      // Note: true archival would be a soft-delete. Here we keep it.
    }
  }

  // Update the action
  action.status =
    body.outcome === "overridden"
      ? "overridden"
      : body.outcome === "accepted"
        ? "accepted"
        : "skipped";
  action.actedByUserId = new Types.ObjectId(session.user.id);
  action.actedAt = now;

  if (body.outcome === "overridden") {
    action.overrideReason = body.overrideReason ?? null;
    action.overrideActionTaken = body.overrideActionTaken ?? null;
  }

  await action.save();

  // Update applicant's lastActionAt
  await Applicant.findByIdAndUpdate(action.applicantId, {
    $set: { lastActionAt: now },
  });

  // Fetch applicant name for audit log
  const applicant = await Applicant.findById(action.applicantId)
    .select("name")
    .lean();

  await recordAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    actorName: session.user.name,
    actorEmail: session.user.email,
    action: `action.${body.outcome}`,
    entityType: "applicant_action",
    entityId: String(action._id),
    message: `${body.outcome === "accepted" ? "Accepted" : body.outcome === "overridden" ? "Overrode" : "Skipped"} action "${action.title}" for ${applicant?.name ?? "unknown applicant"}.`,
    metadata: {
      actionType: action.actionType,
      applicantId: String(action.applicantId),
      outcome: body.outcome,
      overrideReason: body.overrideReason ?? null,
      autoApplied: action.automationAvailable,
    },
  });

  return NextResponse.json(action);
}
