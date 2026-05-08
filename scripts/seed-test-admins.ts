import "dotenv/config";
import bcrypt from "bcryptjs";
import { assertSafeToRun } from "./guard";
import { connectToDatabase } from "@/lib/mongoose";
import Applicant from "@/models/Applicant";
import Organization from "@/models/Organization";
import User from "@/models/User";

// ── Safety guard — must be the first thing that runs ──────────────────────────
assertSafeToRun("seed-test-admins.ts");

const TEST_PASSWORD = "password";
const SHARED_ORGANIZATION_NAME = "JTekNinja Shared Testing";
const LEGACY_TEST_ORGANIZATION_NAMES = [
  "Akeso80 Admin Testing",
  "JTekNinja Admin Testing",
];

const testAdmins = [
  {
    username: "akeso80",
    email: "akeso80@gmail.com",
    name: "akeso80 Admin",
    organizationName: SHARED_ORGANIZATION_NAME,
  },
  {
    username: "jtekninja",
    email: "jtekninja@gmail.com",
    name: "JTekNinja Admin",
    organizationName: SHARED_ORGANIZATION_NAME,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureOrganization(name: string) {
  const existing = await Organization.findOne({ name }).lean();
  if (existing) {
    console.log(`  ↩  Organization already exists: "${name}"`);
    return existing;
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 1;

  while (await Organization.findOne({ slug }).lean()) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const org = await Organization.create({
    name,
    slug,
    plan: "pro",
    billingStatus: "active",
  });

  console.log(`  ✓  Created organization: "${name}" (slug: ${slug})`);
  return org;
}

async function seedTestAdmins() {
  await connectToDatabase();

  console.log("🔍 Checking for legacy organizations to migrate...");

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const sharedOrganization = await ensureOrganization(SHARED_ORGANIZATION_NAME);

  const legacyOrganizationNames = Array.from(
    new Set([
      ...LEGACY_TEST_ORGANIZATION_NAMES,
      ...testAdmins.map((admin) => admin.organizationName),
    ]),
  );

  const legacyOrganizations = await Organization.find({
    name: { $in: legacyOrganizationNames },
  }).lean();

  const legacyOrganizationIds = legacyOrganizations
    .map((organization) => String(organization._id))
    .filter((id) => id !== String(sharedOrganization._id));

  if (legacyOrganizationIds.length > 0) {
    console.log(
      `  ⚠️  Migrating applicants from ${legacyOrganizationIds.length} legacy org(s) → "${SHARED_ORGANIZATION_NAME}"`,
    );

    const result = await Applicant.updateMany(
      { organizationId: { $in: legacyOrganizationIds } },
      { $set: { organizationId: sharedOrganization._id } },
    );

    console.log(`  ✓  Migrated ${result.modifiedCount} applicant(s).`);
  } else {
    console.log("  ✓  No legacy organizations to migrate.");
  }

  console.log("");
  console.log("👤 Upserting test admin accounts...");

  for (const admin of testAdmins) {
    await User.findOneAndUpdate(
      {
        $or: [{ email: admin.email }, { username: admin.username }],
      },
      {
        name: admin.name,
        email: admin.email,
        username: admin.username,
        passwordHash,
        organizationId: sharedOrganization._id,
        role: "owner",
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      },
    );

    console.log(`  ✓  Upserted: ${admin.username} (${admin.email})`);
  }

  console.log("");
  console.log("✅ Test admin accounts ready.");
  console.log("");
  console.log("  Login credentials (password: 'password'):");
  for (const admin of testAdmins) {
    console.log(`    ${admin.username} / ${TEST_PASSWORD}  →  ${admin.email}`);
  }
  console.log("");
}

seedTestAdmins()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ seed-test-admins failed:", error);
    process.exit(1);
  });
