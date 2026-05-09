import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import ApplicantAction from "@/models/ApplicantAction";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ applicantId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  const { applicantId } = await context.params;

  await dbConnect();

  const actions = await ApplicantAction.find({
    applicantId: new Types.ObjectId(applicantId),
    organizationId: new Types.ObjectId(session.user.organizationId),
  })
    .sort({ actedAt: -1, generatedAt: -1 })
    .lean();

  return NextResponse.json({ actions });
}
