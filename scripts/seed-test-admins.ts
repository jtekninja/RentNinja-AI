import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongoose";
import Applicant from "@/models/Applicant";
import Organization from "@/models/Organization";
import User from "@/models/User";

const TEST_PASSWORD = "password";
const SHARED_ORGANIZATION_NAME = "JTekNinja Shared Testing";
const LEGACY_TEST_ORGANIZATION_NAMES = ["Akeso80 Admin Testing", "JTekNinja Admin Testing"];

const testAdmins = [
  {
    username: "akeso80",
    email: "akeso80@gmail.com",
    name: "akeso80 Admin",
    organizationName: SHARED_ORGANIZATION_NAME
  },
  {
    username: "jtekninja",
    email: "jtekninja@gmail.com",
    name: "JTekNinja Admin",
    organizationName: SHARED_ORGANIZATION_NAME
  }
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
    return existing;
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 1;

  while (await Organization.findOne({ slug }).lean()) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return Organization.create({
    name,
    slug,
    plan: "pro",
    billingStatus: "active"
  });
}

async function seedTestAdmins() {
  await connectToDatabase();

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
  const sharedOrganization = await ensureOrganization(SHARED_ORGANIZATION_NAME);
  const legacyOrganizationNames = Array.from(new Set([...LEGACY_TEST_ORGANIZATION_NAMES, ...testAdmins.map((admin) => admin.organizationName)]));
  const legacyOrganizations = await Organization.find({ name: { $in: legacyOrganizationNames } }).lean();
  const legacyOrganizationIds = legacyOrganizations
    .map((organization) => String(organization._id))
    .filter((id) => id !== String(sharedOrganization._id));

  if (legacyOrganizationIds.length > 0) {
    await Applicant.updateMany(
      { organizationId: { $in: legacyOrganizationIds } },
      { $set: { organizationId: sharedOrganization._id } }
    );
  }

  for (const admin of testAdmins) {
    await User.findOneAndUpdate(
      {
        $or: [{ email: admin.email }, { username: admin.username }]
      },
      {
        name: admin.name,
        email: admin.email,
        username: admin.username,
        passwordHash,
        organizationId: sharedOrganization._id,
        role: "owner"
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true
      }
    );
  }

  console.log("Test admin accounts ready:");
  console.log("  akeso80 / password");
  console.log("  jtekninja / password");
}

seedTestAdmins()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
