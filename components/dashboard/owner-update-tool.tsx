"use client";

import { useMemo, useState } from "react";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import { getApplicantIntelligence } from "@/lib/applicant-intelligence";
import { getNextBestAction } from "@/lib/next-best-action";

type DemoProperty = {
  name: string;
  address: string;
  rent: number;
};

const updateTypes = [
  "New applicant summary",
  "Strong candidate update",
  "Missing documents update",
  "Finalist comparison",
  "Approval request",
];

export function OwnerUpdateTool({
  applicants,
  properties,
}: {
  applicants: ApplicantRecord[];
  properties: DemoProperty[];
}) {
  const [applicantId, setApplicantId] = useState(applicants[0]?._id ?? "");
  const [propertyName, setPropertyName] = useState(properties[0]?.name ?? "");
  const [updateType, setUpdateType] = useState(updateTypes[0]);
  const [copied, setCopied] = useState(false);

  const applicant =
    applicants.find((item) => item._id === applicantId) ?? applicants[0];
  const property =
    properties.find((item) => item.name === propertyName) ?? properties[0];

  const message = useMemo(() => {
    if (!applicant) return "";

    const intel = getApplicantIntelligence(applicant);
    const nextAction = getNextBestAction(applicant, intel);
    const incomeRentRatio =
      applicant.responsibleRent > 0
        ? applicant.monthlyIncome / applicant.responsibleRent
        : applicant.affordabilityRatio;
    const received = intel.documentsReceived.length
      ? intel.documentsReceived.slice(0, 5).join(", ")
      : "No documents confirmed yet";
    const missing = intel.documentsMissing.length
      ? intel.documentsMissing.slice(0, 5).join(", ")
      : "No major missing documents detected";

    return `Owner update: ${updateType}

Applicant: ${applicant.name}
Property/unit: ${property?.address || applicant.propertyAddress || "Not assigned"}
Rent: $${(applicant.monthlyRent || property?.rent || 0).toLocaleString()}/month
Income/rent ratio: ${incomeRentRatio.toFixed(1)}x
Ninja Decision Score: ${intel.score}/100
Applicant Readiness: ${intel.readiness}%
Risk level: ${intel.riskLevel}

Documents received: ${received}
Missing documents: ${missing}

Strength: ${intel.mainStrength}
Concern: ${intel.mainConcern}
Recommendation: ${nextAction.nextBestActionLabel}
Next step: ${nextAction.nextBestActionReason}

Fair Housing reminder: This summary is based on objective screening criteria only. Final rental decisions are your responsibility.`;
  }, [applicant, property, updateType]);

  async function copyMessage() {
    await navigator.clipboard?.writeText(message);
    setCopied(true);
  }

  return (
    <section className="dashboard-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
        Owner Update
      </p>
      <h2 className="mt-2 text-xl font-black text-[#050b1f]">
        Send a clean owner-facing update
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
        Pick an applicant, choose the update type, and RentNinja formats the
        important facts without internal notes.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold text-[#071126]">
          Applicant
          <select
            className="dashboard-input"
            value={applicantId}
            onChange={(event) => setApplicantId(event.target.value)}
          >
            {applicants.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#071126]">
          Property
          <select
            className="dashboard-input"
            value={propertyName}
            onChange={(event) => setPropertyName(event.target.value)}
          >
            {properties.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#071126]">
          Update type
          <select
            className="dashboard-input"
            value={updateType}
            onChange={(event) => setUpdateType(event.target.value)}
          >
            {updateTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <textarea
        className="mt-4 min-h-80 w-full rounded-[18px] border border-[#94a3b8] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f] focus:shadow-[0_0_0_3px_rgba(255,75,31,0.22)]"
        value={message}
        readOnly
      />

      <p className="mt-3 rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3 text-sm font-black text-[#071126]">
        Owner update generated. Estimated time saved: 20 minutes.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={copyMessage} className="field-action">
          {copied ? "Copied" : "Copy update"}
        </button>
        <a
          className="field-action"
          href={`mailto:?subject=${encodeURIComponent("Applicant owner update")}&body=${encodeURIComponent(message)}`}
        >
          Email owner
        </a>
        <button type="button" className="field-action" onClick={() => print()}>
          Print
        </button>
      </div>
    </section>
  );
}
