import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dbConnect } from "@/lib/mongodb";
import Property from "@/models/Property";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return unauthorized();
  }

  await dbConnect();
  const properties = await Property.find({
    organizationId: session.user.organizationId,
  })
    .sort({ name: 1, address: 1 })
    .lean();

  return NextResponse.json(
    properties.map((property) => ({
      _id: String(property._id),
      name: property.name || "",
      address: property.address || "",
      monthlyRent: Number(property.monthlyRent ?? 0) || 0,
      securityDepositMonths: Number(property.securityDepositMonths ?? 1) || 1,
      requireFirstMonthAtSigning: property.requireFirstMonthAtSigning !== false,
      utilitiesIncluded: Boolean(property.utilitiesIncluded),
      unitCount: Number(property.unitCount ?? 0) || 0,
      propertyType: property.propertyType || "",
    })),
  );
}
