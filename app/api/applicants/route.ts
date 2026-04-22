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

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  await dbConnect();

  const applicants = await Applicant.find({
    ownerId: new Types.ObjectId(session.user.id),
    organizationId: new Types.ObjectId(session.user.organizationId)
  })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(applicants.map((applicant) => serializeApplicant(applicant)));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const json = await request.json();
  const parsed = applicantSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid applicant." }, { status: 400 });
  }

  await dbConnect();

  const scoring = calculateApplicantScore(parsed.data);
  const normalizedNotes = Array.isArray(parsed.data.notes)
    ? parsed.data.notes
    : parsed.data.notes
      ? [parsed.data.notes]
      : [];

  const applicant = await Applicant.create({
    organizationId: session.user.organizationId,
    ownerId: session.user.id,
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

  return NextResponse.json(serializeApplicant(applicant.toObject()), { status: 201 });
}

