import Link from "next/link";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { serializeApplicantRecord } from "@/lib/applicant-serialization";
import { getApplicantIntelligence } from "@/lib/applicant-intelligence";
import { getNextBestAction } from "@/lib/next-best-action";
import { dbConnect } from "@/lib/mongodb";
import { requireSession } from "@/lib/require-session";
import Applicant from "@/models/Applicant";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";

// ── Helpers ──────────────────────────────────────────────────────────────────
function readinessLabel(p: number) {
  if (p >= 85) return "Ready";
  if (p >= 70) return "Almost ready";
  if (p >= 40) return "Needs documents";
  return "Manual review";
}

function riskPillClass(risk: string) {
  if (risk === "Low") return "pill pill-success";
  if (risk === "Medium") return "pill pill-warning";
  return "pill pill-error";
}

function scoreColor(s: number) {
  if (s >= 80) return "text-[#059669]";
  if (s >= 65) return "text-[#d97706]";
  return "text-[#dc2626]";
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) notFound();

  await dbConnect();
  const applicant = await Applicant.findOne({
    _id: new Types.ObjectId(id),
    organizationId: new Types.ObjectId(session.user.organizationId),
  }).lean();

  if (!applicant) notFound();

  const record = serializeApplicantRecord(
    applicant,
  ) as unknown as ApplicantRecord;
  const intel = getApplicantIntelligence(record);
  const nextAction = getNextBestAction(record, intel);

  return (
    <WorkspacePageShell
      eyebrow="Applicant"
      title={record.name}
      description={`${intel.readiness}% ready | Score ${intel.score}/100 | ${intel.riskLevel} risk`}
    >
      {/* ── Top hero card ── */}
      <section className="card overflow-hidden">
        <div className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill pill-info">{record.status}</span>
                <span className={riskPillClass(intel.riskLevel)}>
                  {intel.riskLevel} risk
                </span>
                <span className="pill pill-success">
                  {readinessLabel(intel.readiness)}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
                {record.name}
              </h1>
              <p className="mt-1 text-sm text-[#475569]">
                {record.email} | {record.phone} | {record.propertyCity},{" "}
                {record.propertyState}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {record.phone && (
                <>
                  <a
                    href={`tel:${record.phone}`}
                    className="btn-secondary text-sm !min-h-[40px] !px-4 !py-2"
                  >
                    Call
                  </a>
                  <a
                    href={`sms:${record.phone}`}
                    className="btn-secondary text-sm !min-h-[40px] !px-4 !py-2"
                  >
                    Text
                  </a>
                </>
              )}
              {record.email && (
                <a
                  href={`mailto:${record.email}`}
                  className="btn-secondary text-sm !min-h-[40px] !px-4 !py-2"
                >
                  Email
                </a>
              )}
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card-inner px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                Score
              </p>
              <p
                className={`mt-1 text-xl font-black ${scoreColor(intel.score)}`}
              >
                {intel.score}/100
              </p>
            </div>
            <div className="card-inner px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                Readiness
              </p>
              <p className="mt-1 text-xl font-black text-[#ff4b1f]">
                {intel.readiness}%
              </p>
            </div>
            <div className="card-inner px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                Affordability
              </p>
              <p className="mt-1 text-xl font-black">
                {record.affordabilityRatio.toFixed(1)}x
              </p>
            </div>
            <div className="card-inner px-4 py-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                Risk
              </p>
              <p className="mt-1 text-xl font-black">{intel.riskLevel}</p>
            </div>
            <div className="card-inner px-4 py-3 text-center sm:col-span-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                AI Confidence
              </p>
              <p className="mt-1 text-lg font-black">
                {intel.confidenceLevel}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#475569]">
                {intel.confidenceReason}
              </p>
            </div>
          </div>

          {/* Next best action */}
          <div className="mt-4 rounded-xl border border-[#ffccb5] bg-[#fff0ea] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff4b1f]">
              Next Step
            </p>
            <p className="mt-1 text-sm font-bold">
              {nextAction.nextBestActionLabel}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#475569]">
              {nextAction.nextBestActionReason}
            </p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="border-t border-[#e8eef6] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/messages" className="btn-primary text-sm">
              Generate Message
            </Link>
            <Link href="/dashboard/reports" className="btn-secondary text-sm">
              Owner Report
            </Link>
            <Link href="/dashboard/compare" className="btn-secondary text-sm">
              Compare
            </Link>
            <Link href="/dashboard/messages" className="btn-secondary text-sm">
              Request Documents
            </Link>
            <button type="button" className="btn-secondary text-sm">
              Apply Status: {nextAction.suggestedStatus}
            </button>
            <Link
              href={`/dashboard/new?id=${record._id}`}
              className="btn-ghost text-sm"
            >
              Edit
            </Link>
          </div>
        </div>
      </section>

      {/* ── Main content cards ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Summary */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
            Summary
          </h2>
          <div className="mt-3 space-y-2">
            <div className="card-inner px-4 py-3">
              <p className="text-xs font-bold text-[#475569]">Decision</p>
              <p className="mt-1 text-sm font-semibold">{intel.verdict}</p>
            </div>
            <div className="card-inner px-4 py-3">
              <p className="text-xs font-bold text-[#475569]">Strength</p>
              <p className="mt-1 text-sm font-semibold">
                {intel.mainStrength ?? "Calculating..."}
              </p>
            </div>
            <div className="card-inner px-4 py-3">
              <p className="text-xs font-bold text-[#475569]">Concern</p>
              <p className="mt-1 text-sm font-semibold">
                {intel.mainConcern ?? "None identified"}
              </p>
            </div>
          </div>
        </section>

        {/* Missing Documents */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
            Smart Missing Docs
          </h2>
          {intel.documentsMissing.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#b8c4d4] p-6 text-center">
              <p className="text-sm font-semibold text-[#475569]">
                All documents complete
              </p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {intel.documentsMissing.map((doc) => (
                <li
                  key={doc}
                  className="card-inner flex items-center gap-3 px-4 py-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fef2f2] text-xs font-bold text-[#dc2626]">
                    !
                  </span>
                  <span className="text-sm font-semibold">{doc}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/messages" className="btn-secondary mt-4 text-sm">
            Generate document request
          </Link>
        </section>

        {/* Strengths & Concerns */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
            Strengths & Concerns
          </h2>
          <div className="mt-3 space-y-2">
            <div className="card-inner px-4 py-3">
              <p className="text-xs font-bold text-[#059669]">Strength</p>
              <p className="mt-1 text-sm font-semibold">{intel.mainStrength}</p>
            </div>
            <div className="card-inner px-4 py-3">
              <p className="text-xs font-bold text-[#d97706]">Concern</p>
              <p className="mt-1 text-sm font-semibold">{intel.mainConcern}</p>
            </div>
            {record.redFlags.length > 0 && (
              <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
                <p className="text-xs font-bold text-[#dc2626]">Red Flags</p>
                <ul className="mt-1 list-inside list-disc text-sm font-medium text-[#dc2626]">
                  {record.redFlags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Affordability */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
            Affordability
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="card-inner px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                Monthly Rent
              </p>
              <p className="mt-1 text-lg font-bold">
                ${record.monthlyRent.toLocaleString()}
              </p>
            </div>
            <div className="card-inner px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                Income
              </p>
              <p className="mt-1 text-lg font-bold">
                ${record.monthlyIncome.toLocaleString()}
              </p>
            </div>
            <div className="card-inner px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                Ratio
              </p>
              <p className="mt-1 text-lg font-bold">
                {record.affordabilityRatio.toFixed(1)}x
              </p>
            </div>
            <div className="card-inner px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                Voucher
              </p>
              <p className="mt-1 text-lg font-bold">{record.housingSupport}</p>
            </div>
          </div>
        </section>

        {/* Notes & Timeline */}
        <section className="card p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
            Notes & Activity
          </h2>
          <div className="mt-3 space-y-2">
            {record.notes.length === 0 ? (
              <p className="text-sm text-[#475569]">No notes yet.</p>
            ) : (
              record.notes.map((note, i) => (
                <div key={i} className="card-inner px-4 py-3">
                  <p className="text-xs font-medium text-[#475569] whitespace-pre-wrap">
                    {note}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Advanced details accordion */}
      <details className="card p-5 sm:p-6">
        <summary className="cursor-pointer font-bold text-[#475569]">
          Advanced Details
        </summary>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Source", record.applicationSource],
            ["Move-in", record.moveInDate || "Not provided"],
            [
              "Resident Score",
              record.residentScore > 0 ? record.residentScore : "N/A",
            ],
            ["Subsidy Program", record.supportProgram || "N/A"],
            [
              "Tenant Portion",
              record.tenantPortionRent > 0
                ? `$${record.tenantPortionRent}`
                : "N/A",
            ],
            ["Subsidy Status", record.subsidyStatus],
            ["Inspection", record.inspectionStatus],
            ["Created", new Date(record.createdAt).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label} className="card-inner px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                {label}
              </p>
              <p className="mt-1 text-sm font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </details>

      <section className="card p-5 sm:p-6 lg:hidden">
        <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
          Field Mode
        </p>
        <h2 className="mt-1 text-lg font-bold text-[#050b1f]">
          Showing quick actions
        </h2>
        <textarea
          className="dashboard-input mt-3 min-h-24"
          placeholder="Add showing note..."
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          {["Mark showed", "No-show", "Interested", "Upload doc"].map(
            (action) => (
              <button key={action} type="button" className="field-action">
                {action}
              </button>
            ),
          )}
        </div>
      </section>

      <div className="rounded-xl border border-[#b8c4d4] bg-white px-4 py-3 text-center text-xs font-bold text-[#475569]">
        Fair Housing Mode: On. RentNinja uses objective screening criteria
        only. Final decisions are your responsibility.
      </div>

      {/* Mobile sticky button */}
      <div className="fixed inset-x-3 bottom-24 z-30 grid max-w-md grid-cols-4 gap-2 rounded-[24px] border border-[#b8c4d4] bg-white/95 p-2 shadow-[0_14px_30px_rgba(15,23,42,0.18)] backdrop-blur lg:hidden">
        <Link href="/dashboard/messages" className="field-action !px-2 !text-xs">
          Next Step
        </Link>
        <Link href="/dashboard/messages" className="field-action !px-2 !text-xs">
          Message
        </Link>
        <button type="button" className="field-action !px-2 !text-xs">
          Note
        </button>
        <Link href="/dashboard/reports" className="field-action !px-2 !text-xs">
          More
        </Link>
      </div>
    </WorkspacePageShell>
  );
}
