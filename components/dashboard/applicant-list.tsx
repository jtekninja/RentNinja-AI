"use client";

import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

export type ApplicantRecord = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  monthlyRent: number;
  monthlyIncome: number;
  creditScore: number;
  scores: {
    income: number;
    credit: number;
    rentalHistory: number;
    rulesCompliance: number;
    timeline: number;
    communication: number;
    documentation: number;
  };
  totalScore: number;
  affordabilityRatio: number;
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

export function ApplicantList({ applicants, onEdit, onDelete }: ApplicantListProps) {
  if (applicants.length === 0) {
    return (
      <section className="rounded-[32px] border border-dashed border-white/10 bg-white/4 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-[#f7b36d]">No Applicants Yet</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Create your first scoring record</h2>
        <p className="mt-2 text-sm text-slate-300">
          RentNinja AI will calculate weighted score totals, decisions, affordability, and red flags automatically.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4">
      {applicants.map((applicant) => (
        <article key={applicant._id} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold text-white">{applicant.name}</h3>
                <StatusPill tone={applicant.decision === "Strong" ? "strong" : applicant.decision === "Review" ? "review" : "risk"}>
                  {applicant.decision}
                </StatusPill>
                <StatusPill tone="neutral">{applicant.status}</StatusPill>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {applicant.email} | {applicant.phone} | Created {formatDate(applicant.createdAt)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white">
                {applicant.totalScore}/100
              </div>
              <Button variant="secondary" onClick={() => onEdit(applicant)}>
                Edit
              </Button>
              <Button variant="danger" onClick={() => onDelete(applicant._id)}>
                Delete
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Rent" value={formatCurrency(applicant.monthlyRent)} />
            <Metric label="Income" value={formatCurrency(applicant.monthlyIncome)} />
            <Metric label="Affordability" value={`${applicant.affordabilityRatio.toFixed(1)}x`} />
            <Metric label="Credit" value={applicant.creditScore.toString()} />
            <Metric label="Status" value={applicant.status} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr,0.7fr]">
            <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Score Breakdown</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Score label="Income" value={applicant.scores.income} />
                <Score label="Credit" value={applicant.scores.credit} />
                <Score label="Rental History" value={applicant.scores.rentalHistory} />
                <Score label="Rules" value={applicant.scores.rulesCompliance} />
                <Score label="Timeline" value={applicant.scores.timeline} />
                <Score label="Communication" value={applicant.scores.communication} />
                <Score label="Documentation" value={applicant.scores.documentation} />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Red Flag Detection</p>
              {applicant.redFlags.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-sm text-slate-100">
                  {applicant.redFlags.map((flag) => (
                    <li key={flag} className="rounded-2xl border border-rose-300/15 bg-rose-300/8 px-3 py-2">
                      {flag}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-emerald-100">No high-risk red flags detected from current inputs.</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/8 bg-black/15 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Notes</p>
            {applicant.notes.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm text-slate-100">
                {applicant.notes.map((note) => (
                  <li key={note} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-300">No notes recorded.</p>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

