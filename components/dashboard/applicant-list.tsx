"use client";

import Link from "next/link";
import { useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, isUnsetNumber } from "@/lib/utils";
import type { ApplicantAiAnalysis } from "@/lib/ai-types";
import { normalizeResidentScore } from "@/lib/scoring";
import { ActionPanel } from "@/components/dashboard/action-panel";
import type { applicantStatusValues } from "@/lib/validators";
import {
  ActivityTimeline,
  FieldMode,
  MissingDocsCard,
  NinjaDecisionCard,
  OwnerPresentationMode,
} from "@/components/dashboard/intelligence-widgets";

export type ApplicantRecord = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyId?: string;
  propertyUnit?: string;
  propertyNickname?: string;
  borough?: string;
  neighborhood?: string;
  utilitiesIncluded?: boolean;
  bedrooms?: number | null;
  bathrooms?: number | null;
  propertyMonthlyRent?: number;
  rentSource?: string;
  incomeSource?: string;
  dueAtSigningSource?: string;
  securityDepositMonths?: number | null;
  requireFirstMonthAtSigning?: boolean;
  financialFieldsCorrected?: boolean;
  financialCorrectionNote?: string;
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
  dueAtSigning?: number;
  securityDeposit?: number;
  firstMonthRent?: number;
  brokerFee?: number;
  petFee?: number;
  otherMoveInFees?: number;
  dueAtSigningAmount?: number;
  dueAtSigningRawText?: string;
  dueAtSigningNeedsConfirmation?: boolean;
  applicantGrossMonthlyIncome?: number | null;
  applicantAnnualIncome?: number | null;
  applicantIncomeAmount?: number | null;
  applicantIncomeFrequency?: "hourly" | "weekly" | "biweekly" | "monthly" | "yearly" | "unknown";
  tenantPortion?: number;
  voucherPortion?: number;
  securityDepositAmount?: number;
  firstMonthRentAmount?: number;
  incomeAmount?: number | null;
  incomeFrequency?: "hourly" | "weekly" | "biweekly" | "monthly" | "yearly" | "unknown";
  normalizedMonthlyIncome?: number | null;
  incomeToRentRatio?: number | null;
  housingSupport: "None" | "Voucher" | "Subsidy";
  supportProgram: string;
  monthlySubsidyAmount: number;
  tenantPortionRent: number;
  subsidyStatus: "N/A" | "Pending" | "Verified";
  inspectionStatus: "N/A" | "Pending" | "Passed" | "Failed";
  creditScore?: number;
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
  rawText?: string;
  rawPastedText?: string;
  sourceText?: string;
  extractedDocumentText?: string;
  documentExtracts?: string;
  aiSummary?: string;
  aiRecommendation?: string;
  aiRecommendedStatus?: string;
  aiStrengths?: string[];
  aiRedFlags?: string[];
  suggestedMessage?: string;
  extractedFieldSummary?: string;
  missingDocuments?: string[];
  receivedDocuments?: string[];
  followUpQuestions?: string[];
  importantNotes?: string[];
  nextStep?: string;
  extractedFields?: Record<string, unknown>;
  uploadedFiles?: {
    filename: string;
    type: string;
    size: number;
    uploadedAt: string;
    extractionStatus: string;
  }[];
  updateHistory?: {
    updatedAt: string;
    sourceText: string;
    fieldsChanged: {
      field: string;
      label: string;
      oldValue: unknown;
      newValue: unknown;
      confidence: "Low" | "Medium" | "High";
      reason: string;
    }[];
  }[];
  status: (typeof applicantStatusValues)[number];
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
      <section className="dashboard-card p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#d63a12]">
          No Applicants Yet
        </p>
        <h2 className="mt-3 text-2xl font-bold text-[#050b1f]">
          Start with one applicant.
        </h2>
        <p className="mt-2 text-sm font-medium text-[#334155]">
          Paste a Zillow message, upload a packet, or enter details manually.
          RentNinja will organize the file, score readiness, and show the next
          best step.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      {applicants.map((applicant) => (
        <article key={applicant._id} className="dashboard-card p-5">
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
                      <h3 className="text-xl font-bold text-[#050b1f]">
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
                    <div className="mt-3">
                      <NinjaDecisionCard applicant={applicant} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-[#334155]">
                      {applicant.email} | {applicant.phone} | Created{" "}
                      {formatDate(applicant.createdAt)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#334155]">
                      Source: {sourceLabel}
                    </p>
                    {applicant.propertyAddress ? (
                      <p className="mt-1 text-sm font-medium text-[#334155]">
                        Property: {applicant.propertyAddress}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="field-action" href="/dashboard/messages">
                      One-Click Follow-Up
                    </Link>
                    <div className="rounded-full border border-[#94a3b8] bg-white px-4 py-2 text-sm font-bold text-[#071126]">
                      {isUnsetNumber(applicant.totalScore)
                        ? "Pending score"
                        : `${applicant.totalScore}/100`}
                    </div>
                    <Button
                      variant="secondary"
                      className="!border !border-[#94a3b8] !bg-white !text-[#071126] !ring-0 hover:!border-[#ff4b1f] hover:!bg-[#f8fafc] hover:!text-[#ff4b1f]"
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
                      className="!border !border-[#94a3b8] !bg-white !text-[#071126] !ring-0 hover:!border-[#ff4b1f] hover:!bg-[#f8fafc] hover:!text-[#ff4b1f]"
                      onClick={() => onEdit(applicant)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      className="!border !border-rose-300 !bg-rose-50 !text-[#dc2626] !ring-0 hover:!bg-rose-100"
                      onClick={() => onDelete(applicant._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {error ? (
                  <div className="mt-4 rounded-[22px] border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-[#dc2626]">
                    {error}
                  </div>
                ) : null}

                {analysis ? (
                  <div className="mt-4 overflow-hidden rounded-[24px] border border-[#b8c4d4] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
                    <div className="border-b border-[#b8c4d4] px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
                          AI Review
                        </p>
                        <div className="h-1.5 w-1.5 rounded-full bg-[#ff4b1f]" />
                        <p className="text-sm font-medium text-[#334155]">
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
                      <div className="dashboard-card-darker px-4 py-4">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
                          Decision summary
                        </p>
                        <p className="mt-3 max-w-5xl text-sm font-medium leading-7 text-[#334155]">
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

                <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
                  <MissingDocsCard applicant={applicant} />
                  <ActivityTimeline applicant={applicant} />
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
                  <div className="dashboard-card-darker p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
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

                  <div className="dashboard-card-darker p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
                      Red Flag Detection
                    </p>
                    {applicant.redFlags.length > 0 ? (
                      <ul className="mt-3 grid gap-2 text-sm font-medium text-[#334155]">
                        {applicant.redFlags.map((flag) => (
                          <li
                            key={flag}
                            className="rounded-2xl border border-rose-300 bg-rose-50 px-3 py-2 font-semibold text-[#dc2626]"
                          >
                            {flag}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-emerald-600">
                        No high-risk red flags detected from current inputs.
                      </p>
                    )}
                  </div>
                </div>

                {applicant.coApplicants.length > 0 ? (
                  <div className="mt-4 dashboard-card-darker p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
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
                          className="rounded-[20px] border border-[#b8c4d4] bg-white p-4"
                        >
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
                            Co-applicant
                          </p>
                          <p className="mt-2 text-lg font-bold text-[#050b1f]">
                            {coApplicant.name}
                          </p>
                          <p className="mt-2 text-sm font-medium text-[#334155]">
                            {[coApplicant.email, coApplicant.phone]
                              .filter(Boolean)
                              .join(" | ") || "Contact details not provided"}
                          </p>
                          <p className="mt-3 text-sm font-bold text-[#071126]">
                            {isUnsetNumber(coApplicant.monthlyIncome)
                              ? "Income not provided"
                              : `Monthly income ${formatCurrency(coApplicant.monthlyIncome)}`}
                          </p>
                          <p className="mt-2 text-sm font-medium text-[#334155]">
                            {isUnsetNumber(coApplicant.residentScore)
                              ? "ResidentScore not provided"
                              : `ResidentScore ${coApplicant.residentScore}`}
                          </p>
                          {coApplicant.notes ? (
                            <p className="mt-2 text-sm font-medium text-[#334155]">
                              {coApplicant.notes}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 dashboard-card-darker p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
                    Notes
                  </p>
                  {applicant.notes.length > 0 ? (
                    <ul className="mt-3 grid gap-2 text-sm font-medium text-[#334155]">
                      {applicant.notes.map((note) => (
                        <NoteSection key={note} note={note} />
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm font-medium text-[#334155]">
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
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <OwnerPresentationMode applicant={applicant} />
                  <FieldMode applicant={applicant} />
                </div>
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
    <div className="dashboard-card-darker p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
        {label}
      </p>
      <p
        className={`mt-2 text-lg font-bold ${value ? "text-[#071126]" : "text-[#475569]"}`}
      >
        {value ?? "Not provided"}
      </p>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#b8c4d4] bg-white px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
        {label}
      </p>
      <p
        className={`mt-1 text-base font-bold ${isUnsetNumber(value) ? "text-[#475569]" : "text-[#071126]"}`}
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
        ? "text-[#059669]"
      : tone === "review"
        ? "text-[#d97706]"
        : "text-[#d63a12]";
  const chipClass =
    tone === "strong"
      ? "bg-emerald-50 border-emerald-300"
      : tone === "review"
        ? "bg-amber-50 border-amber-300"
        : "bg-white border-[#b8c4d4]";

  return (
    <div className="dashboard-card-darker p-4">
      <p
        className={`text-xs font-bold uppercase tracking-[0.12em] ${accentClass}`}
      >
        {title}
      </p>
      <ul className="mt-3 grid gap-2.5 text-sm font-medium text-[#334155]">
        {items.map((item) => (
          <li
            key={item}
            className={`flex items-start gap-3 rounded-2xl border px-3 py-3 leading-6 ${chipClass}`}
          >
            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-current" />
            <span className="min-w-0 break-words text-[#334155]">{item}</span>
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
    <li className="rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
        {heading}
      </p>
      {hasBody ? (
        <div className="mt-3 border-t border-[#b8c4d4] pt-3 text-sm font-medium leading-6 text-[#334155]">
          {bodyLines.map((line, index) => (
            <p key={`${heading}-${index}`}>{line || "\u00A0"}</p>
          ))}
        </div>
      ) : null}
    </li>
  );
}
