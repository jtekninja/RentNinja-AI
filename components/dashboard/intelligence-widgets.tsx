"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import {
  getApplicantIntelligence,
  getWorkflowSuggestion,
  type ApplicantIntelligence,
} from "@/lib/applicant-intelligence";
import { formatCurrency } from "@/lib/utils";

function toneForRisk(risk: ApplicantIntelligence["riskLevel"]) {
  if (risk === "Low") return "border-emerald-300 bg-emerald-50 text-[#059669]";
  if (risk === "Medium") return "border-amber-300 bg-amber-50 text-[#d97706]";
  return "border-rose-300 bg-rose-50 text-[#dc2626]";
}

export function NinjaDecisionCard({ applicant }: { applicant: ApplicantRecord }) {
  const intel = useMemo(() => getApplicantIntelligence(applicant), [applicant]);

  return (
    <section className="rounded-[20px] border border-[#b8c4d4] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.1)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
            Ninja Decision Score
          </p>
          <h3 className="mt-2 text-2xl font-black text-[#050b1f]">
            {intel.score}/100
          </h3>
          <p className="mt-1 text-sm font-bold text-[#334155]">
            {intel.verdict}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <span className={`rounded-full border px-3 py-2 text-xs font-black ${toneForRisk(intel.riskLevel)}`}>
            {intel.riskLevel} risk
          </span>
          <span className="rounded-full border border-[#94a3b8] bg-white px-3 py-2 text-xs font-black text-[#071126]">
            {intel.confidenceLevel} confidence
          </span>
        </div>
      </div>
      <p className="mt-3 rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-4 py-3 text-sm font-semibold leading-6 text-[#334155]">
        Confidence reason: {intel.confidenceReason}
      </p>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-[#071126]">
            Applicant Readiness
          </p>
          <p className="text-sm font-black text-[#ff4b1f]">
            {intel.readiness}%
          </p>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full border border-[#b8c4d4] bg-[#e8eef6]">
          <div
            className="h-full rounded-full bg-[#ff4b1f]"
            style={{ width: `${intel.readiness}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-bold text-[#334155]">
          {intel.readinessLabel}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MiniBlock label="Main strength" value={intel.mainStrength} />
        <MiniBlock label="Main concern" value={intel.mainConcern} />
      </div>
      <div className="mt-3 rounded-2xl border border-[#ffb89f] bg-[#fff0ea] px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
          Recommended next action
        </p>
        <p className="mt-2 text-sm font-bold leading-6 text-[#071126]">
          {getWorkflowSuggestion(applicant, intel)}
        </p>
      </div>
    </section>
  );
}

export function MissingDocsCard({ applicant }: { applicant: ApplicantRecord }) {
  const intel = useMemo(() => getApplicantIntelligence(applicant), [applicant]);

  return (
    <section className="dashboard-card-darker p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
        Smart Missing Docs
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DocList title="Received" items={intel.documentsReceived} empty="No documents confirmed yet." />
        <DocList title="Missing" items={intel.documentsMissing} empty="No missing documents detected." />
      </div>
      {intel.verificationNeeded.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-[#92400e]">
          Verification needed: {intel.verificationNeeded.join(", ")}
        </div>
      ) : null}
      <div className="mt-3">
        <Link className="field-action" href="/dashboard/messages">
          Generate document request
        </Link>
      </div>
    </section>
  );
}

export function OwnerPresentationMode({ applicant }: { applicant: ApplicantRecord }) {
  const [copied, setCopied] = useState(false);
  const intel = useMemo(() => getApplicantIntelligence(applicant), [applicant]);
  const summary = [
    `Owner summary for ${applicant.name}`,
    `Property: ${applicant.propertyAddress || "Not assigned"}`,
    `Rent: ${formatCurrency(applicant.monthlyRent)}`,
    `Income/rent ratio: ${applicant.affordabilityRatio.toFixed(1)}x`,
    `Ninja Decision Score: ${intel.score}/100`,
    `Readiness: ${intel.readiness}% (${intel.readinessLabel})`,
    applicant.housingSupport !== "None"
      ? `Voucher/subsidy: ${applicant.supportProgram || applicant.housingSupport}; tenant portion ${formatCurrency(applicant.tenantPortionRent)}; verification ${applicant.subsidyStatus}`
      : "Voucher/subsidy: none noted",
    `Strength: ${intel.mainStrength}`,
    `Concern: ${intel.mainConcern}`,
    `Missing: ${intel.documentsMissing.join(", ") || "None detected"}`,
    `Recommended next step: ${intel.recommendedNextAction}`,
    "Fair Housing reminder: RentNinja uses objective screening criteria only. Final decisions are your responsibility.",
  ].join("\n");

  async function copySummary() {
    await navigator.clipboard?.writeText(summary);
    setCopied(true);
  }

  return (
    <details className="dashboard-card-darker p-4">
      <summary className="cursor-pointer text-sm font-black text-[#071126]">
        Owner Presentation Mode
      </summary>
      <div className="mt-4 rounded-[18px] border border-[#b8c4d4] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
              Owner-ready report
            </p>
            <h3 className="mt-2 text-xl font-black text-[#050b1f]">
              {applicant.name}
            </h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
              {summary}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={copySummary}>
            {copied ? "Copied" : "Copy owner summary"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            Print report
          </Button>
          <Button type="button" variant="secondary">
            Save to timeline
          </Button>
          <Button type="button" variant="secondary">
            Generate owner email
          </Button>
        </div>
      </div>
    </details>
  );
}

export function FieldMode({ applicant }: { applicant: ApplicantRecord }) {
  const [note, setNote] = useState("");
  const intel = useMemo(() => getApplicantIntelligence(applicant), [applicant]);

  return (
    <details className="dashboard-card-darker p-4">
      <summary className="cursor-pointer text-sm font-black text-[#071126]">
        Mobile Field Mode
      </summary>
      <div className="mt-4 grid gap-3">
        <div className="rounded-[18px] border border-[#b8c4d4] bg-white p-4">
          <p className="text-lg font-black text-[#050b1f]">{applicant.name}</p>
          <p className="mt-1 text-sm font-bold text-[#334155]">
            {intel.score}/100 | {intel.readiness}% ready | {intel.riskLevel} risk
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <a className="field-action" href={`tel:${applicant.phone}`}>Call</a>
          <a className="field-action" href={`sms:${applicant.phone}`}>Text</a>
          <a className="field-action" href={`mailto:${applicant.email}`}>Email</a>
        </div>
        <textarea
          className="min-h-24 rounded-[16px] border border-[#94a3b8] bg-white px-4 py-3 text-base font-semibold text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f] focus:shadow-[0_0_0_3px_rgba(255,75,31,0.22)]"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add showing note..."
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {["Mark interested", "Mark no-show", "Request documents", "Generate follow-up", "Upload screenshot", "Change status"].map((action) => (
            <button
              key={action}
              type="button"
              className="min-h-[46px] rounded-full border border-[#94a3b8] bg-white px-4 py-2 text-sm font-black text-[#071126] hover:border-[#ff4b1f] hover:bg-[#fff0ea]"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}

export function ActivityTimeline({ applicant }: { applicant: ApplicantRecord }) {
  const intel = useMemo(() => getApplicantIntelligence(applicant), [applicant]);
  const events = [
    ...intel.timeline,
    { label: "Message generated", detail: "Ready for one-click follow-up", tone: "info" as const },
    { label: "Owner report created", detail: "Available in Owner Presentation Mode", tone: "success" as const },
  ];

  return (
    <section className="dashboard-card-darker p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
        Timeline and Activity Log
      </p>
      <div className="mt-3 grid gap-2">
        {events.map((event) => (
          <div key={`${event.label}-${event.detail}`} className="rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3">
            <p className="text-sm font-black text-[#071126]">{event.label}</p>
            <p className="mt-1 text-sm font-semibold text-[#475569]">{event.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#475569]">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-[#071126]">{value}</p>
    </div>
  );
}

function DocList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl border border-[#b8c4d4] bg-white p-4">
      <p className="text-sm font-black text-[#071126]">{title}</p>
      <ul className="mt-2 grid gap-2 text-sm font-semibold text-[#334155]">
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>{empty}</li>}
      </ul>
    </div>
  );
}
