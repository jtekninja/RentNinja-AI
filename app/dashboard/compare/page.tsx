import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { getApplicantIntelligence } from "@/lib/applicant-intelligence";
import { getDashboardData } from "@/lib/data/dashboard";
import { getNextBestAction } from "@/lib/next-best-action";
import { requireSession } from "@/lib/require-session";

export default async function ComparePage() {
  const session = await requireSession();
  const data = await getDashboardData(
    session.user.id,
    session.user.organizationId,
  );
  const candidates = data.applicants
    .map((applicant) => ({
      applicant,
      intel: getApplicantIntelligence(applicant),
    }))
    .map((item) => ({
      ...item,
      nextAction: getNextBestAction(item.applicant, item.intel),
    }))
    .sort((a, b) => b.intel.score - a.intel.score)
    .slice(0, 3);

  return (
    <WorkspacePageShell
      eyebrow="Compare"
      title="Compare finalists"
      description="Compare applicants with mobile cards, not tiny tables. Focus on score, readiness, missing items, and the next step."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {candidates.length > 0 ? (
          candidates.map(({ applicant, intel, nextAction }, index) => (
            <article
              key={applicant._id}
              className="rounded-[20px] border border-[#b8c4d4] bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.08)]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
                Candidate {index + 1}
              </p>
              <h2 className="mt-2 text-xl font-bold text-[#050b1f]">
                {applicant.name}
              </h2>
              <div className="mt-4 grid gap-2">
                {[
                  ["Ninja Decision Score", `${intel.score}/100`],
                  ["Applicant Readiness Meter", `${intel.readiness}%`],
                  ["Readiness label", intel.readinessLabel],
                  ["Income/rent ratio", `${applicant.affordabilityRatio.toFixed(1)}x`],
                  ["Risk level", intel.riskLevel],
                  ["Missing items", `${intel.documentsMissing.length}`],
                  ["Next step", nextAction.nextBestActionLabel],
                  ["Reason", nextAction.nextBestActionReason],
                ].map(([metric, value]) => (
                  <div
                    key={metric}
                    className="rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-3 py-2 text-sm font-semibold"
                  >
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[#475569]">
                      {metric}
                    </span>
                    <span className="mt-1 block text-[#071126]">{value}</span>
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          [1, 2, 3].map((index) => (
            <article
              key={index}
              className="rounded-[20px] border border-dashed border-[#b8c4d4] bg-white p-5"
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
                Candidate {index}
              </p>
              <h2 className="mt-2 text-xl font-bold text-[#050b1f]">
                Add applicants to compare
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
                Load demo data or add applicants to see score, readiness, risk,
                missing items, and next steps.
              </p>
            </article>
          ))
        )}
      </section>

      <section className="dashboard-card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
          What should I do next?
        </p>
        <h2 className="mt-2 text-xl font-bold text-[#050b1f]">
          Compare the top ready applicants, then prepare an owner report.
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
          RentNinja keeps recommendations tied to objective criteria: income,
          documents, rental history, references, readiness, and missing
          information.
        </p>
      </section>
    </WorkspacePageShell>
  );
}
