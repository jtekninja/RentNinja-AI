import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import ApplicantAction from "@/models/ApplicantAction";
import { recordAuditLog } from "@/lib/audit-log";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const FEEDBACK_LIMIT = {
  limit: 60,
  windowMs: 60_000,
  label: "action-feedback",
};

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ actionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const rateCheck = checkRateLimit(request, FEEDBACK_LIMIT, session.user.id);
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck);

  const { actionId } = await context.params;

  let body: {
    outcome?: "positive" | "negative" | "neutral";
    outcomeNote?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid request body." },
      { status: 400 },
    );
  }

  if (
    !body.outcome ||
    !["positive", "negative", "neutral"].includes(body.outcome)
  ) {
    return NextResponse.json(
      { message: "outcome must be: positive, negative, or neutral." },
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

  // Only resolved actions can receive feedback
  if (
    !["accepted", "skipped", "overridden", "auto_applied"].includes(
      action.status,
    )
  ) {
    return NextResponse.json(
      { message: "Only resolved actions can receive feedback." },
      { status: 409 },
    );
  }

  action.outcome = body.outcome;
  if (body.outcomeNote) {
    action.outcomeNote = body.outcomeNote;
  }

  await action.save();

  await recordAuditLog({
    organizationId: session.user.organizationId,
    actorUserId: session.user.id,
    actorName: session.user.name,
    actorEmail: session.user.email,
    action: "action.feedback",
    entityType: "applicant_action",
    entityId: String(action._id),
    message: `Recorded "${body.outcome}" feedback for action "${action.title}".`,
    metadata: {
      actionType: action.actionType,
      applicantId: String(action.applicantId),
      outcome: body.outcome,
      outcomeNote: body.outcomeNote ?? null,
    },
  });

  return NextResponse.json(action);
}
