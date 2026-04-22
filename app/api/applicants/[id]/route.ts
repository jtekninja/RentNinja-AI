import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import { applicantSchema } from "@/lib/validators";
import { calculateApplicantScore } from "@/lib/scoring";
import Applicant from "@/models/Applicant";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function serializeApplicant(applicant: Record<string, unknown>) {
  return {
    ...applicant,
    _id: String(applicant._id),
    organizationId: String(applicant.organizationId),
    ownerId: String(applicant.ownerId),
    createdAt: new Date(String(applicant.createdAt)).toISOString(),
    updatedAt: new Date(String(applicant.updatedAt)).toISOString()
  };
}

async function findApplicant(id: string, userId: string, organizationId: string) {
  await dbConnect();

  return Applicant.findOne({
    _id: new Types.ObjectId(id),
    ownerId: new Types.ObjectId(userId),
    organizationId: new Types.ObjectId(organizationId)
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const json = await request.json();
  const parsed = applicantSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid applicant." }, { status: 400 });
  }

  const applicant = await findApplicant(id, session.user.id, session.user.organizationId);
  if (!applicant) {
    return NextResponse.json({ message: "Applicant not found." }, { status: 404 });
  }

  const scoring = calculateApplicantScore(parsed.data);
  const normalizedNotes = Array.isArray(parsed.data.notes)
    ? parsed.data.notes
    : parsed.data.notes
      ? [parsed.data.notes]
      : [];

  applicant.set({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    monthlyRent: parsed.data.monthlyRent,
    monthlyIncome: parsed.data.monthlyIncome,
    creditScore: parsed.data.creditScore,
    scores: scoring.scores,
    totalScore: scoring.totalScore,
    decision: scoring.decision,
    affordabilityRatio: scoring.affordabilityRatio,
    redFlags: scoring.redFlags,
    notes: normalizedNotes,
    status: parsed.data.status
  });

  await applicant.save();

  return NextResponse.json(serializeApplicant(applicant.toObject()));
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const applicant = await findApplicant(id, session.user.id, session.user.organizationId);

  if (!applicant) {
    return NextResponse.json({ message: "Applicant not found." }, { status: 404 });
  }

  await applicant.deleteOne();
  return NextResponse.json({ ok: true });
}

