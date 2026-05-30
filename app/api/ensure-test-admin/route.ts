import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongoose";
import Organization from "@/models/Organization";
import User from "@/models/User";

const TEST_PASSWORD = "password123";

export async function POST() {
  try {
    await connectToDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ensure-test-admin] MongoDB connection failed:", message);
    return NextResponse.json(
      { error: "Database connection failed", detail: message },
      { status: 500 },
    );
  }

  try {
    // Find or create the shared test organization
    let org = await Organization.findOne({
      name: "JTekNinja Shared Testing",
    }).lean();

    if (!org) {
      org = await Organization.create({
        name: "JTekNinja Shared Testing",
        slug: "jtekninja-shared-testing",
        plan: "pro",
        billingStatus: "active",
      });
    }

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

    // Also find or create the owner@rentninja.ai org
    let ownerOrg = await Organization.findOne({
      name: "RentNinja AI",
    }).lean();

    if (!ownerOrg) {
      ownerOrg = await Organization.create({
        name: "RentNinja AI",
        slug: "rentninja-ai",
        plan: "pro",
        billingStatus: "active",
      });
    }

    // Upsert akeso80 user (shared testing org)
    await User.findOneAndUpdate(
      {
        $or: [{ email: "akeso80@gmail.com" }, { username: "akeso80" }],
      },
      {
        $set: {
          name: "akeso80 Admin",
          email: "akeso80@gmail.com",
          username: "akeso80",
          passwordHash,
          organizationId: org._id,
          role: "owner",
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    // Upsert jtekninja user (shared testing org)
    await User.findOneAndUpdate(
      {
        $or: [{ email: "jtekninja@gmail.com" }, { username: "jtekninja" }],
      },
      {
        $set: {
          name: "JTekNinja Admin",
          email: "jtekninja@gmail.com",
          username: "jtekninja",
          passwordHash,
          organizationId: org._id,
          role: "owner",
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    // Upsert owner@rentninja.ai user (RentNinja AI org)
    await User.findOneAndUpdate(
      {
        $or: [{ email: "owner@rentninja.ai" }, { username: "owner" }],
      },
      {
        $set: {
          name: "RentNinja Owner",
          email: "owner@rentninja.ai",
          username: "owner",
          passwordHash,
          organizationId: ownerOrg._id,
          role: "owner",
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ensure-test-admin] Operation failed:", message);
    return NextResponse.json(
      { error: "Operation failed", detail: message },
      { status: 500 },
    );
  }
}
