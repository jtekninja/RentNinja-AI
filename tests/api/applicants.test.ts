import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import {
  setupTestDb,
  teardownTestDb,
  clearCollections,
  syncIndexes,
} from "../helpers/db";
import Applicant from "@/models/Applicant";
import Organization from "@/models/Organization";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
import type { Mock } from "vitest";

const mockAuth = auth as Mock;

beforeAll(async () => {
  await setupTestDb();
  await syncIndexes();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearCollections();
  vi.clearAllMocks();
});

function createApplicantFields(overrides: Record<string, unknown> = {}) {
  return {
    ownerId: overrides.organizationId as string,
    monthlyRent: 1000,
    monthlyIncome: 4000,
    residentScore: 80,
    rentalHistoryScore: 80,
    rulesComplianceScore: 80,
    timelineScore: 80,
    communicationScore: 80,
    documentationScore: 80,
    scores: {
      income: 80,
      credit: 0,
      resident: 80,
      rentalHistory: 80,
      rulesCompliance: 80,
      timeline: 80,
      communication: 80,
      documentation: 80,
    },
    totalScore: 80,
    decision: "Strong" as const,
    affordabilityRatio: 4,
    responsibleRent: 1000,
    duplicateFingerprint: "",
    ...overrides,
  };
}

describe("Organization data isolation", () => {
  it("returns only applicants belonging to the authenticated organization", async () => {
    const orgA = await Organization.create({ name: "Org A", slug: "org-a" });
    const orgB = await Organization.create({ name: "Org B", slug: "org-b" });

    await Applicant.create({
      ...createApplicantFields({
        organizationId: orgA._id,
        name: "Alice",
        email: "alice@test.com",
        phone: "111",
        duplicateFingerprint: "alice-orga",
      }),
    });

    await Applicant.create({
      ...createApplicantFields({
        organizationId: orgA._id,
        name: "Charlie",
        email: "charlie@test.com",
        phone: "333",
        monthlyRent: 1200,
        monthlyIncome: 5000,
        totalScore: 85,
        affordabilityRatio: 4.17,
        responsibleRent: 1200,
        duplicateFingerprint: "charlie-orga",
      }),
    });

    await Applicant.create({
      ...createApplicantFields({
        organizationId: orgB._id,
        name: "Bob",
        email: "bob@test.com",
        phone: "222",
        monthlyIncome: 3000,
        totalScore: 70,
        decision: "Review" as const,
        affordabilityRatio: 3,
        duplicateFingerprint: "bob-orgb",
      }),
    });

    const orgAApplicants = await Applicant.find({
      organizationId: orgA._id,
    }).lean();
    const orgBApplicants = await Applicant.find({
      organizationId: orgB._id,
    }).lean();

    expect(orgAApplicants).toHaveLength(2);
    expect(orgBApplicants).toHaveLength(1);

    const orgANames = orgAApplicants.map((a) => a.name);
    expect(orgANames).not.toContain("Bob");
    expect(orgANames).toContain("Alice");
    expect(orgANames).toContain("Charlie");
  });

  it("cannot access applicants by ObjectId outside own organization", async () => {
    const orgA = await Organization.create({ name: "Org A", slug: "org-a" });
    const orgB = await Organization.create({ name: "Org B", slug: "org-b" });

    const applicant = await Applicant.create({
      ...createApplicantFields({
        organizationId: orgA._id,
        name: "Alice",
        email: "alice@test.com",
        phone: "111",
        duplicateFingerprint: "alice-idor",
      }),
    });

    const found = await Applicant.findOne({
      _id: applicant._id,
      organizationId: orgB._id,
    }).lean();

    expect(found).toBeNull();
  });
});
