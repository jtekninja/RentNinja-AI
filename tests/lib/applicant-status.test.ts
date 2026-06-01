import { describe, expect, it } from "vitest";
import {
  applicantStatusValues,
  normalizeApplicantStatus,
} from "@/lib/applicant-status";

describe("normalizeApplicantStatus", () => {
  it.each([
    ["Conditionally Approved", "Ready for Review"],
    ["Conditionally approved pending documents", "Ready for Review"],
    ["Pending Documents", "Missing Documents"],
    ["Needs Documents", "Missing Documents"],
    ["Needs Review", "Manual Review"],
    ["Good Candidate", "Strong Candidate"],
    ["Rejected", "Rejected"],
    ["Reject", "Rejected"],
    ["Approved Pending Verification", "Ready for Review"],
    ["", "New"],
    [undefined, "New"],
    ["Something AI invented", "New"],
    ["Pre-screening", "Pre-Screening"],
  ])("maps %s to %s", (input, expected) => {
    expect(normalizeApplicantStatus(input)).toBe(expected);
  });

  it("always returns a valid applicant status enum value", () => {
    const messyAiStatuses = [
      "Conditionally Approved",
      "Pending Documents",
      "Needs Documents",
      "Needs Review",
      "Good Candidate",
      "Approved Pending Verification",
      "Unknown Pipeline Step",
    ];

    for (const status of messyAiStatuses) {
      expect(applicantStatusValues).toContain(normalizeApplicantStatus(status));
    }
  });
});
