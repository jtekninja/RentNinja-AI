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
import Organization from "@/models/Organization";
import ProcessedWebhook from "@/models/ProcessedWebhook";

vi.mock("@/lib/billing", () => ({
  constructStripeEvent: vi.fn(),
}));

import { constructStripeEvent } from "@/lib/billing";
import type { Mock } from "vitest";

const mockConstructStripeEvent = constructStripeEvent as Mock;

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

describe("Stripe webhook database behavior", () => {
  describe("ProcessedWebhook deduplication", () => {
    it("stores an event ID", async () => {
      await ProcessedWebhook.create({ stripeEventId: "evt_test123" });
      const found = await ProcessedWebhook.findOne({
        stripeEventId: "evt_test123",
      }).lean();
      expect(found).not.toBeNull();
    });

    it("rejects duplicate event IDs via unique index", async () => {
      await ProcessedWebhook.create({ stripeEventId: "evt_test123" });
      await ProcessedWebhook.syncIndexes();
      await expect(
        ProcessedWebhook.create({ stripeEventId: "evt_test123" }),
      ).rejects.toThrow();
    });

    it("returns null for unknown event IDs", async () => {
      await ProcessedWebhook.create({ stripeEventId: "evt_existing" });
      const found = await ProcessedWebhook.findOne({
        stripeEventId: "evt_unknown",
      }).lean();
      expect(found).toBeNull();
    });
  });

  describe("Organization billing status updates", () => {
    it("sets plan to pro and status to active on checkout completed", async () => {
      const org = await Organization.create({
        name: "Test Org",
        slug: "test-org",
        plan: "starter",
        billingStatus: "inactive",
      });

      await Organization.findByIdAndUpdate(org._id, {
        $set: {
          stripeCustomerId: "cus_test123",
          stripeSubscriptionId: "sub_test456",
          plan: "pro",
          billingStatus: "active",
        },
      });

      const updated = await Organization.findById(org._id).lean();
      expect(updated?.plan).toBe("pro");
      expect(updated?.billingStatus).toBe("active");
      expect(updated?.stripeCustomerId).toBe("cus_test123");
      expect(updated?.stripeSubscriptionId).toBe("sub_test456");
    });

    it("downgrades to starter when subscription is canceled", async () => {
      const org = await Organization.create({
        name: "Test Org",
        slug: "test-org",
        plan: "pro",
        billingStatus: "active",
        stripeSubscriptionId: "sub_test456",
      });

      await Organization.findOneAndUpdate(
        { stripeSubscriptionId: "sub_test456" },
        {
          $set: {
            plan: "starter",
            billingStatus: "inactive",
            stripeSubscriptionId: "",
          },
        },
      );

      const updated = await Organization.findById(org._id).lean();
      expect(updated?.plan).toBe("starter");
      expect(updated?.billingStatus).toBe("inactive");
      expect(updated?.stripeSubscriptionId).toBe("");
    });

    it("updates billingStatus on subscription update", async () => {
      const org = await Organization.create({
        name: "Test Org",
        slug: "test-org",
        plan: "pro",
        billingStatus: "active",
        stripeSubscriptionId: "sub_test456",
      });

      await Organization.findOneAndUpdate(
        { stripeSubscriptionId: "sub_test456" },
        {
          $set: {
            billingStatus: "past_due",
            plan: "pro",
          },
        },
      );

      let updated = await Organization.findById(org._id).lean();
      expect(updated?.billingStatus).toBe("past_due");
      expect(updated?.plan).toBe("pro");

      await Organization.findOneAndUpdate(
        { stripeSubscriptionId: "sub_test456" },
        {
          $set: {
            billingStatus: "inactive",
            plan: "starter",
          },
        },
      );

      updated = await Organization.findById(org._id).lean();
      expect(updated?.billingStatus).toBe("inactive");
      expect(updated?.plan).toBe("starter");
    });
  });

  describe("Organization lookup by client_reference_id", () => {
    it("can find organization by the ID stored in client_reference_id", async () => {
      const org = await Organization.create({
        name: "Lookup Test",
        slug: "lookup-test",
      });

      const orgId = String(org._id);
      const found = await Organization.findById(orgId).lean();
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Lookup Test");
    });
  });
});
