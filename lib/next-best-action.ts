import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import type { ApplicantIntelligence } from "@/lib/applicant-intelligence";

export type NextBestAction = {
  nextBestActionLabel: string;
  nextBestActionReason: string;
  nextBestActionButton: string;
  recommendedMessageType: string;
  suggestedStatus: string;
};

export function getNextBestAction(
  applicant: ApplicantRecord,
  intel: ApplicantIntelligence,
): NextBestAction {
  if (applicant.status === "Leased") {
    return {
      nextBestActionLabel: "Archive or review lease notes",
      nextBestActionReason: "This applicant is already marked leased.",
      nextBestActionButton: "Review timeline",
      recommendedMessageType: "Lease next steps",
      suggestedStatus: "Leased",
    };
  }

  if (applicant.status === "Approved") {
    return {
      nextBestActionLabel: "Send approved next steps",
      nextBestActionReason: "The applicant is approved and needs clear move-in instructions.",
      nextBestActionButton: "Generate message",
      recommendedMessageType: "Approved next steps",
      suggestedStatus: "Approved",
    };
  }

  if (applicant.status === "Tour Scheduled" || /showing|tour/i.test(applicant.notes.join(" "))) {
    return {
      nextBestActionLabel: "Follow up after showing",
      nextBestActionReason: "A showing appears active or scheduled.",
      nextBestActionButton: "Generate follow-up",
      recommendedMessageType: "Follow up after showing",
      suggestedStatus: "Tour Scheduled",
    };
  }

  if (intel.documentsMissing.length > 0) {
    return {
      nextBestActionLabel: "Request missing documents",
      nextBestActionReason: `${intel.documentsMissing.length} required item${intel.documentsMissing.length === 1 ? "" : "s"} still missing.`,
      nextBestActionButton: "Generate document request",
      recommendedMessageType: "Request missing documents",
      suggestedStatus: "Missing Documents",
    };
  }

  if (intel.confidenceLevel === "Low" || intel.riskLevel === "High") {
    return {
      nextBestActionLabel: "Move to manual review",
      nextBestActionReason: "The score, confidence, or risk level needs human review before next steps.",
      nextBestActionButton: "Review concerns",
      recommendedMessageType: "Ask applicant screening questions",
      suggestedStatus: "Manual Review",
    };
  }

  if (intel.readiness >= 85 && intel.score >= 78) {
    return {
      nextBestActionLabel: "Prepare owner report",
      nextBestActionReason: "This applicant is ready enough to summarize for an owner or decision maker.",
      nextBestActionButton: "Create owner report",
      recommendedMessageType: "Send applicant summary to owner",
      suggestedStatus: "Ready for Review",
    };
  }

  if (intel.readiness >= 70) {
    return {
      nextBestActionLabel: "Compare finalist",
      nextBestActionReason: "The file is close enough to compare with other ready candidates.",
      nextBestActionButton: "Compare applicants",
      recommendedMessageType: "Request owner decision",
      suggestedStatus: "Ready for Review",
    };
  }

  return {
    nextBestActionLabel: "Ask for income clarification",
    nextBestActionReason: "RentNinja needs clearer applicant details before a confident review.",
    nextBestActionButton: "Generate message",
    recommendedMessageType: "Ask applicant screening questions",
    suggestedStatus: "Pre-screening",
  };
}
