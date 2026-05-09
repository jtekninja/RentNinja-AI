"use client";

import { useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, isUnsetNumber } from "@/lib/utils";
import type { ApplicantAiAnalysis } from "@/lib/ai-types";
import { normalizeResidentScore } from "@/lib/scoring";
import { ActionPanel } from "@/components/dashboard/action-panel";

export type ApplicantRecord = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyPostalCode: string;
  moveInDate: string;
  coApplicants: {
    name: string;
    email: string;
    phone: string;
    monthlyIncome: number;
    residentScore: number;
    notes: string;
  }[];
  applicationSource: string;
  monthlyRent: number;
  monthlyIncome: number;
  housingSupport: "None" | "Voucher" | "Subsidy";
  supportProgram: string;
  monthlySubsidyAmount: number;
  tenantPortionRent: number;
  subsidyStatus: "N/A" | "Pending" | "Verified";
  inspectionStatus: "N/A" | "Pending" | "Passed" | "Failed";
  residentScore: number;
  duplicateFingerprint?: string;
  duplicateDayKey?: string;
  scores: {
    income: number;
    credit: number;
    resident: number;
    rentalHistory: number;
    rulesCompliance: number;
    timeline: number;
    communication: number;
    documentation: number;
  };
  totalScore: number;
  affordabilityRatio: number;
  responsibleRent: number;
  decision: "Strong" | "Review" | "Risk";
  redFlags: string[];
  notes: string[];
  status: "New" | "Screening" | "Approved" | "Review" | "Rejected";
  createdAt: string;
  updatedAt: string;
};

type ApplicantListProps = {
  applicants: ApplicantRecord[];
  onEdit: (applicant: ApplicantRecord) => void;
  onDelete: (id: string) => Promise<void>;
};

export function ApplicantList({
  applicants,
  onEdit,
  onDelete,
}: ApplicantListProps) {
  const [analysisById, setAnalysisById] = useState<
    Record<string, ApplicantAiAnalysis>
  >({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [expandedActionIds, setExpandedActionIds] = useState<Set<string>>(
    new Set(),
  );

  async function runAiReview(id: string) {
    setLoadingId(id);
    setErrorById((current) => ({ ...current, [id]: "" }));

    try {
      const response = await fetch(`/api/ai/applicants/${id}/analysis`);
      const data = await response.json();

      if (!response.ok) {
        setErrorById((current) => ({
          ...current,
          [id]: data.message || "Unable to generate AI review.",
        }));
        return;
      }

      setAnalysisById((current) => ({ ...current, [id]: data }));
    } finally {
      setLoadingId((current) => (current === id ? null : current));
    }
  }

  if (applicants.length === 0) {
    return (
      <section className="rounded-[32px] border border-dashed border-white/10 bg-white/4 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-[#f7b36d]">
          No Applicants Yet
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Create your first scoring record
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          RentNinja AI will calculate weighted score totals, decisions,
          affordability, and red flags automatically.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      {applicants.map((applicant) => (
        <article
          key={applicant._id}
          className="rounded-[30px] border border-white/10 bg-white/5 p-5"
        >
          {(() => {
            const analysis = analysisById[applicant._id];
            const error = errorById[applicant._id];
            const normalizedScreeningScore = !isUnsetNumber(
              applicant.scores.resident,
            )
              ? applicant.scores.resident
              : normalizeResidentScore(applicant.residentScore);
            const sourceLabel = applicant.applicationSource || "Email / Manual";
            const rawResidentLabel =
              sourceLabel === "Apartments.com" && applicant.residentScore > 100
                ? "ResidentScore"
                : "Source score";
            const responsibleRentLabel =
              applicant.housingSupport === "None"
                ? "Rent responsibility"
                : "Tenant share";

            return (
              <>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-white">
                        {applicant.name}
                      </h3>
                      <StatusPill
                        tone={
                          applicant.decision === "Strong"
                            ? "strong"
                            : applicant.decision === "Review"
                              ? "review"
                              : "risk"
                        }
                      >
                        {applicant.decision}
                      </StatusPill>
                      <StatusPill tone="neutral">{applicant.status}</StatusPill>
                      {applicant.coApplicants.length > 0 ? (
                        <StatusPill tone="neutral">
                          Joint application
                        </StatusPill>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      {applicant.email} | {applicant.phone} | Created{" "}
                      {formatDate(applicant.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Source: {sourceLabel}
                    </p>
                    {applicant.propertyAddress ? (
                      <p className="mt-1 text-sm text-slate-400">
                        Property: {applicant.propertyAddress}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
                      {isUnsetNumber(applicant.totalScore)
                        ? "Pending score"
                        : `${applicant.totalScore}/100`}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => runAiReview(applicant._id)}
                      disabled={loadingId === applicant._id}
                    >
                      {loadingId === applicant._id
                        ? "Analyzing..."
                        : analysis
                          ? "Refresh AI review"
                          : "AI review"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => onEdit(applicant)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => onDelete(applicant._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {error ? (
                  <div className="mt-4 rounded-[22px] border border-rose-300/20 bg-rose-300/8 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                ) : null}

                {analysis ? (
                  <div className="mt-4 overflow-hidden rounded-[28px] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(114,182,255,0.12),rgba(255,255,255,0.03))] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                    <div className="border-b border-white/8 px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">
                          AI Review
                        </p>
                        <div className="h-1.5 w-1.5 rounded-full bg-cyan-200/80" />
                        <p className="text-sm text-slate-200">
                          Landlord recommendation snapshot
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusPill
                          tone={
                            analysis.recommendation === "Approve"
                              ? "strong"
                              : analysis.recommendation === "Review"
                                ? "review"
                                : "risk"
                          }
                        >
                          {analysis.recommendation}
                        </StatusPill>
                        <StatusPill tone="neutral">
                          {analysis.confidence} confidence
                        </StatusPill>
                      </div>
                    </div>
                    <div className="px-5 py-5">
                      <div className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                          Decision summary
                        </p>
                        <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-100">
                          {analysis.summary}
                        </p>
                      </div>
                      <div className="mt-4 grid gap-4 xl:grid-cols-3">
                        <InsightList
                          title="Strengths"
                          items={analysis.strengths}
                          tone="strong"
                        />
                        <InsightList
                          title="Concerns"
                          items={analysis.concerns}
                          tone="review"
                        />
                        <InsightList
                          title="Follow-up"
                          items={analysis.followUpQuestions}
                          tone="neutral"
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <Metric
                    label="Rent"
                    value={
                      isUnsetNumber(applicant.monthlyRent)
                        ? null
                        : formatCurrency(applicant.monthlyRent)
                    }
                  />
                  <Metric
                    label="Household income"
                    value={
                      isUnsetNumber(applicant.monthlyIncome)
                        ? null
                        : formatCurrency(applicant.monthlyIncome)
                    }
                  />
                  <Metric
                    label="Affordability"
                    value={
                      isUnsetNumber(applicant.responsibleRent) ||
                      isUnsetNumber(applicant.monthlyIncome)
                        ? null
                        : `${applicant.affordabilityRatio.toFixed(1)}x`
                    }
                  />
                  <Metric
                    label={rawResidentLabel}
                    value={
                      isUnsetNumber(applicant.residentScore)
                        ? null
                        : applicant.residentScore.toString()
                    }
                  />
                  <Metric label="Status" value={applicant.status} />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Screening score"
                    value={
                      isUnsetNumber(normalizedScreeningScore)
                        ? null
                        : `${normalizedScreeningScore}/100`
                    }
                  />
                  <Metric label="Application source" value={sourceLabel} />
                  <Metric
                    label="Property address"
                    value={applicant.propertyAddress || null}
                  />
                  <Metric
                    label="Property jurisdiction"
                    value={
                      [
                        applicant.propertyCity,
                        applicant.propertyState,
                        applicant.propertyPostalCode,
                      ]
                        .filter(Boolean)
                        .join(", ") || null
                    }
                  />
                  <Metric
                    label="Move-in date"
                    value={applicant.moveInDate || null}
                  />
                  <Metric
                    label="Housing assistance"
                    value={
                      applicant.housingSupport === "None"
                        ? "None"
                        : applicant.supportProgram || applicant.housingSupport
                    }
                  />
                  <Metric
                    label={responsibleRentLabel}
                    value={
                      isUnsetNumber(applicant.responsibleRent)
                        ? null
                        : formatCurrency(applicant.responsibleRent)
                    }
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Subsidy amount"
                    value={
                      isUnsetNumber(applicant.monthlySubsidyAmount)
                        ? null
                        : formatCurrency(applicant.monthlySubsidyAmount)
                    }
                  />
                  <Metric
                    label="Assistance verification"
                    value={
                      applicant.housingSupport === "None"
                        ? "N/A"
                        : applicant.subsidyStatus
                    }
                  />
                  <Metric
                    label="Inspection"
                    value={
                      applicant.housingSupport === "None"
                        ? "N/A"
                        : applicant.inspectionStatus
                    }
                  />
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr,0.7fr]">
                  <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                      Score Breakdown
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Score label="Income" value={applicant.scores.income} />
                      <Score
                        label="Screening"
                        value={normalizedScreeningScore}
                      />
                      <Score
                        label="Rental History"
                        value={applicant.scores.rentalHistory}
                      />
                      <Score
                        label="Rules"
                        value={applicant.scores.rulesCompliance}
                      />
                      <Score
                        label="Timeline"
                        value={applicant.scores.timeline}
                      />
                      <Score
                        label="Communication"
                        value={applicant.scores.communication}
                      />
                      <Score
                        label="Documentation"
                        value={applicant.scores.documentation}
                      />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                      Red Flag Detection
                    </p>
                    {applicant.redFlags.length > 0 ? (
                      <ul className="mt-3 grid gap-2 text-sm text-slate-100">
                        {applicant.redFlags.map((flag) => (
                          <li
                            key={flag}
                            className="rounded-2xl border border-rose-300/15 bg-rose-300/8 px-3 py-2"
                          >
                            {flag}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-emerald-100">
                        No high-risk red flags detected from current inputs.
                      </p>
                    )}
                  </div>
                </div>

                {applicant.coApplicants.length > 0 ? (
                  <div className="mt-4 rounded-[24px] border border-white/8 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                      Household applicants
                    </p>
                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <Metric
                        label="Primary applicant"
                        value={applicant.name}
                      />
                      <Metric
                        label="Adults on application"
                        value={`${applicant.coApplicants.length + 1}`}
                      />
                      {applicant.coApplicants.map((coApplicant) => (
                        <div
                          key={`${coApplicant.name}-${coApplicant.email}-${coApplicant.phone}`}
                          className="rounded-[22px] border border-white/8 bg-white/5 p-4"
                        >
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                            Co-applicant
                          </p>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {coApplicant.name}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {[coApplicant.email, coApplicant.phone]
                              .filter(Boolean)
                              .join(" | ") || "Contact details not provided"}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-white">
                            {isUnsetNumber(coApplicant.monthlyIncome)
                              ? "Income not provided"
                              : `Monthly income ${formatCurrency(coApplicant.monthlyIncome)}`}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {isUnsetNumber(coApplicant.residentScore)
                              ? "ResidentScore not provided"
                              : `ResidentScore ${coApplicant.residentScore}`}
                          </p>
                          {coApplicant.notes ? (
                            <p className="mt-2 text-sm text-slate-300">
                              {coApplicant.notes}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-[24px] border border-white/8 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                    Notes
                  </p>
                  {applicant.notes.length > 0 ? (
                    <ul className="mt-3 grid gap-2 text-sm text-slate-100">
                      {applicant.notes.map((note) => (
                        <NoteSection key={note} note={note} />
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-slate-300">
                      No notes recorded.
                    </p>
                  )}
                </div>

                <ActionPanel
                  applicantId={applicant._id}
                  expanded={expandedActionIds.has(applicant._id)}
                  onToggle={() =>
                    setExpandedActionIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(applicant._id)) {
                        next.delete(applicant._id);
                      } else {
                        next.add(applicant._id);
                      }
                      return next;
                    })
                  }
                />
              </>
            );
          })()}
        </article>
      ))}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
        {label}
      </p>
      <p
        className={`mt-2 text-lg font-semibold ${value ? "text-white" : "text-slate-500"}`}
      >
        {value ?? "Not provided"}
      </p>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-semibold ${isUnsetNumber(value) ? "text-slate-500" : "text-white"}`}
      >
        {isUnsetNumber(value) ? "Not provided" : value}
      </p>
    </div>
  );
}

function InsightList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "strong" | "review" | "neutral";
}) {
  const accentClass =
    tone === "strong"
      ? "text-emerald-200"
      : tone === "review"
        ? "text-amber-100"
        : "text-cyan-100";
  const chipClass =
    tone === "strong"
      ? "bg-emerald-300/10 border-emerald-300/15"
      : tone === "review"
        ? "bg-amber-300/10 border-amber-300/15"
        : "bg-white/6 border-white/10";

  return (
    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <p
        className={`text-xs font-semibold uppercase tracking-[0.22em] ${accentClass}`}
      >
        {title}
      </p>
      <ul className="mt-3 grid gap-2.5 text-sm text-slate-100">
        {items.map((item) => (
          <li
            key={item}
            className={`flex items-start gap-3 rounded-2xl border px-3 py-3 leading-6 ${chipClass}`}
          >
            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-current opacity-80" />
            <span className="min-w-0 break-words text-slate-100">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoteSection({ note }: { note: string }) {
  const [heading, ...bodyLines] = note.split("\n");
  const hasBody = bodyLines.some((line) => line.trim().length > 0);

  return (
    <li className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f7b36d]">
        {heading}
      </p>
      {hasBody ? (
        <div className="mt-3 border-t border-white/8 pt-3 text-sm leading-6 text-slate-100">
          {bodyLines.map((line, index) => (
            <p key={`${heading}-${index}`}>{line || "\u00A0"}</p>
          ))}
        </div>
      ) : null}
    </li>
  );
}
