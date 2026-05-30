"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import { getApplicantIntelligence } from "@/lib/applicant-intelligence";
import { getNextBestAction } from "@/lib/next-best-action";

type ReviewResult = {
  applicantName: string;
  phone: string;
  email: string;
  moveInDate: string;
  monthlyRent: string;
  householdIncome: string;
  employmentInfo: string;
  voucherInfo: string;
  tenantPortion: string;
  occupants: string;
  petsSmoking: string;
  documentsMentioned: string[];
  missingDocuments: string[];
  redFlagsOrConcerns: string[];
  followUpQuestions: string[];
  suggestedStatus: string;
  ninjaDecisionScore: number;
  readiness: number;
  riskLevel: string;
  confidenceLevel: string;
  confidenceReason: string;
  mainStrength: string;
  mainConcern: string;
  bestNextStep: string;
  suggestedMessage: string;
  demoMode: boolean;
};

type SavedReview = {
  id: string;
  applicantId?: string;
  savedAt: string;
  rawInput: string;
  result: ReviewResult;
};

type OwnerReportView = {
  id: string;
  applicantName: string;
  preparedAt: string;
  sourceLabel: string;
  score: string;
  readiness: string;
  riskLevel: string;
  confidenceLevel: string;
  mainStrength: string;
  mainConcern: string;
  bestNextStep: string;
  suggestedStatus: string;
  phone: string;
  email: string;
  moveInDate: string;
  monthlyRent: string;
  householdIncome: string;
  voucherInfo: string;
  tenantPortion: string;
  missingDocuments: string[];
  concerns: string[];
  suggestedMessage: string;
};

const STORAGE_KEY = "rentninja:reviewed-applicants";

function loadReviews(): SavedReview[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function reportFromReview(review: SavedReview): OwnerReportView {
  return {
    id: review.id,
    applicantName: review.result.applicantName || "Unnamed Applicant",
    preparedAt: review.savedAt,
    sourceLabel: review.result.demoMode ? "Demo AI review" : "AI review",
    score: `${review.result.ninjaDecisionScore}/100`,
    readiness: `${review.result.readiness}%`,
    riskLevel: review.result.riskLevel,
    confidenceLevel: review.result.confidenceLevel,
    mainStrength: review.result.mainStrength,
    mainConcern: review.result.mainConcern,
    bestNextStep: review.result.bestNextStep,
    suggestedStatus: review.result.suggestedStatus,
    phone: review.result.phone || "Not provided",
    email: review.result.email || "Not provided",
    moveInDate: review.result.moveInDate || "Not provided",
    monthlyRent: review.result.monthlyRent || "Not provided",
    householdIncome: review.result.householdIncome || "Not provided",
    voucherInfo: review.result.voucherInfo || "None",
    tenantPortion: review.result.tenantPortion || "Not provided",
    missingDocuments: review.result.missingDocuments,
    concerns: review.result.redFlagsOrConcerns,
    suggestedMessage: review.result.suggestedMessage,
  };
}

function reportFromApplicant(applicant: ApplicantRecord): OwnerReportView {
  const intel = getApplicantIntelligence(applicant);
  const nextAction = getNextBestAction(applicant, intel);
  const suggestedMessage =
    applicant.notes
      .find((note) => note.toLowerCase().startsWith("suggested message"))
      ?.replace(/^suggested message/i, "")
      .trim() || nextAction.nextBestActionReason;

  return {
    id: applicant._id,
    applicantName: applicant.name || "Unnamed Applicant",
    preparedAt: applicant.updatedAt,
    sourceLabel: "Saved applicant",
    score: `${intel.score}/100`,
    readiness: `${intel.readiness}%`,
    riskLevel: intel.riskLevel,
    confidenceLevel: intel.confidenceLevel,
    mainStrength: intel.mainStrength,
    mainConcern: intel.mainConcern,
    bestNextStep: nextAction.nextBestActionLabel,
    suggestedStatus: applicant.status,
    phone: applicant.phone || "Not provided",
    email: applicant.email || "Not provided",
    moveInDate: applicant.moveInDate || "Not provided",
    monthlyRent: applicant.monthlyRent
      ? `$${applicant.monthlyRent.toLocaleString()}`
      : "Not provided",
    householdIncome: applicant.monthlyIncome
      ? `$${applicant.monthlyIncome.toLocaleString()}`
      : "Not provided",
    voucherInfo:
      applicant.housingSupport === "None"
        ? "None"
        : applicant.supportProgram || applicant.housingSupport,
    tenantPortion: applicant.tenantPortionRent
      ? `$${applicant.tenantPortionRent.toLocaleString()}`
      : "Not provided",
    missingDocuments: intel.documentsMissing,
    concerns: applicant.redFlags.length
      ? applicant.redFlags
      : [intel.mainConcern].filter(Boolean),
    suggestedMessage,
  };
}

export function ReportsClient() {
  const searchParams = useSearchParams();
  const reviewId = searchParams.get("reviewId");
  const applicantId = searchParams.get("applicantId");
  const [reviews, setReviews] = useState<SavedReview[]>([]);
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setReviews(loadReviews());
      try {
        const response = await fetch("/api/applicants");
        const data = await response.json();
        if (active && response.ok && Array.isArray(data)) {
          setApplicants(data);
        }
      } catch (error) {
        console.error("Unable to load saved applicants for owner reports:", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const report = useMemo(() => {
    const review = reviews.find((item) => item.id === reviewId) ?? null;
    const applicant =
      applicants.find((item) => item._id === applicantId) ??
      (review?.applicantId
        ? applicants.find((item) => item._id === review.applicantId)
        : null);

    if (applicant) return reportFromApplicant(applicant);
    if (review) return reportFromReview(review);
    return null;
  }, [applicantId, applicants, reviewId, reviews]);

  return (
    <WorkspacePageShell
      eyebrow="Reports"
      title="Owner Report"
      description="Create a clean owner-facing report with applicant summary, documents, concerns, and next steps."
    >
      {loading ? (
        <div className="dashboard-card p-5 text-center">
          <p className="text-sm font-semibold text-[#475569]">Loading...</p>
        </div>
      ) : report ? (
        <OwnerReportCard report={report} />
      ) : (
        <section className="dashboard-card p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
            Owner Report
          </p>
          <h2 className="mt-2 text-xl font-bold">No applicant selected</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#475569]">
            Start a 1-Minute Review, save the applicant, then create an owner
            report. Saved applicants appear below.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/dashboard/ai#one-minute" className="btn-primary text-sm">
              Start 1-Minute Review
            </Link>
            <Link href="/dashboard/applicants" className="btn-secondary text-sm">
              View Saved Applicants
            </Link>
          </div>

          {applicants.length > 0 ? (
            <SavedApplicantsList applicants={applicants} />
          ) : null}

          {reviews.length > 0 ? (
            <SavedReviewsList reviews={reviews} />
          ) : null}
        </section>
      )}

      <section className="upgrade-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
              Premium feature
            </p>
            <p className="mt-1 text-sm font-semibold text-[#334155]">
              Owner Reports save time when presenting applicants to property
              owners. Upgrade to Pro to unlock PDF export.
            </p>
          </div>
          <Link href="/dashboard/billing" className="btn-secondary text-sm">
            View plans
          </Link>
        </div>
      </section>
    </WorkspacePageShell>
  );
}

function OwnerReportCard({ report }: { report: OwnerReportView }) {
  return (
    <section className="dashboard-card overflow-hidden">
      <div className="border-b border-[#e8eef6] px-5 py-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
          Owner Report
        </p>
        <h2 className="mt-1 text-2xl font-bold">{report.applicantName}</h2>
        <p className="mt-1 text-sm text-[#475569]">
          Prepared {new Date(report.preparedAt).toLocaleDateString()} -{" "}
          {report.sourceLabel}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#e8eef6] sm:grid-cols-4">
        <MetricBox label="Score" value={report.score} accent />
        <MetricBox label="Readiness" value={report.readiness} />
        <MetricBox label="Risk" value={report.riskLevel} />
        <MetricBox label="Confidence" value={report.confidenceLevel} />
      </div>

      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 sm:px-6">
        <FieldCard label="Main Strength" value={report.mainStrength} />
        <FieldCard label="Main Concern" value={report.mainConcern} />
        <FieldCard label="Best Next Step" value={report.bestNextStep} bold />
        <FieldCard label="Suggested Status" value={report.suggestedStatus} bold />
      </div>

      <ReportSection title="Contact">
        <FieldCard compact label="Phone" value={report.phone} />
        <FieldCard compact label="Email" value={report.email} />
        <FieldCard compact label="Move-in" value={report.moveInDate} />
      </ReportSection>

      <ReportSection title="Financials" columns="sm:grid-cols-4">
        <FieldCard compact label="Rent" value={report.monthlyRent} />
        <FieldCard compact label="Income" value={report.householdIncome} />
        <FieldCard compact label="Voucher" value={report.voucherInfo} />
        <FieldCard compact label="Tenant portion" value={report.tenantPortion} />
      </ReportSection>

      <ListSection
        title="Missing Documents"
        items={report.missingDocuments}
        empty="All documents appear to be in order."
      />

      <ListSection
        title="Concerns"
        items={report.concerns}
        empty="No major concerns listed."
      />

      <div className="border-t border-[#e8eef6] px-5 py-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
          Suggested Message
        </p>
        <div className="mt-2 rounded-xl border border-[#ffccb5] bg-[#fff0ea] p-4">
          <p className="text-sm leading-6 text-[#334155]">
            {report.suggestedMessage}
          </p>
        </div>
      </div>

      <div className="border-t border-[#e8eef6] px-5 py-3 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/ai" className="btn-primary text-sm">
            Back to AI Tools
          </Link>
          <Link href="/dashboard/messages" className="btn-secondary text-sm">
            Generate Message
          </Link>
          <Link href="/dashboard/compare" className="btn-secondary text-sm">
            Compare
          </Link>
        </div>
      </div>
    </section>
  );
}

function SavedApplicantsList({ applicants }: { applicants: ApplicantRecord[] }) {
  return (
    <div className="mt-8 text-left">
      <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
        Saved applicants ({applicants.length})
      </p>
      <div className="mt-3 space-y-2">
        {applicants.map((applicant) => (
          <Link
            key={applicant._id}
            href={`/dashboard/reports?applicantId=${applicant._id}`}
            className="card-inner flex items-center justify-between gap-3 px-4 py-3 hover:border-[#ff4b1f]"
          >
            <div>
              <p className="text-sm font-bold">{applicant.name}</p>
              <p className="text-xs text-[#475569]">
                {applicant.email} - {new Date(applicant.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <span className="text-sm font-bold text-[#ff4b1f]">View</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SavedReviewsList({ reviews }: { reviews: SavedReview[] }) {
  return (
    <div className="mt-8 text-left">
      <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
        Saved AI reviews ({reviews.length})
      </p>
      <div className="mt-3 space-y-2">
        {reviews.map((review) => (
          <Link
            key={review.id}
            href={`/dashboard/reports?reviewId=${review.id}${review.applicantId ? `&applicantId=${review.applicantId}` : ""}`}
            className="card-inner flex items-center justify-between gap-3 px-4 py-3 hover:border-[#ff4b1f]"
          >
            <div>
              <p className="text-sm font-bold">
                {review.result.applicantName || "Unnamed Applicant"}
              </p>
              <p className="text-xs text-[#475569]">
                Score {review.result.ninjaDecisionScore} -{" "}
                {new Date(review.savedAt).toLocaleDateString()}
              </p>
            </div>
            <span className="text-sm font-bold text-[#ff4b1f]">View</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ReportSection({
  title,
  children,
  columns = "sm:grid-cols-3",
}: {
  title: string;
  children: React.ReactNode;
  columns?: string;
}) {
  return (
    <div className="border-t border-[#e8eef6] px-5 py-4 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
        {title}
      </p>
      <div className={`mt-2 grid gap-2 ${columns}`}>{children}</div>
    </div>
  );
}

function ListSection({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="border-t border-[#e8eef6] px-5 py-4 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-[#475569]">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="card-inner px-3 py-2 text-sm font-medium text-[#334155]"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-white px-4 py-4 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-black ${accent ? "text-[#ff4b1f]" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function FieldCard({
  label,
  value,
  bold,
  compact,
}: {
  label: string;
  value: string;
  bold?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`card-inner ${compact ? "px-3 py-2" : "p-4"}`}>
      <p
        className={`${compact ? "text-[10px]" : "text-xs"} font-bold uppercase tracking-wider text-[#475569]`}
      >
        {label}
      </p>
      <p
        className={`mt-1 ${compact ? "text-sm font-semibold" : `text-sm ${bold ? "font-bold text-[#071126]" : "font-semibold"}`}`}
      >
        {value}
      </p>
    </div>
  );
}
