import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { getApplicantIntelligence } from "@/lib/applicant-intelligence";
import { getDashboardData } from "@/lib/data/dashboard";
import { getNextBestAction } from "@/lib/next-best-action";
import { requireSession } from "@/lib/require-session";
import { formatDueAtSigningBreakdown } from "@/lib/move-in-costs";

export default async function ComparePage() {
  const session = await requireSession();

  let data: Awaited<ReturnType<typeof getDashboardData>>;
  try {
    data = await getDashboardData(session.user.id, session.user.organizationId);
  } catch {
    data = {
      applicants: [],
      organization: null,
      summary: {
        total: 0,
        strong: 0,
        review: 0,
        risk: 0,
        avgScore: 0,
        avgAffordability: 0,
      },
    } as Awaited<ReturnType<typeof getDashboardData>>;
  }

  const candidates = (data.applicants ?? [])
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
      description="Compare applicants with mobile cards. Focus on score, readiness, missing items, and the next step."
    >
      {candidates.length === 0 ? (
        <section className="dashboard-card p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
            Compare
          </p>
          <h2 className="mt-2 text-xl font-bold">
            No applicants to compare yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#475569]">
            Save applicants from the 1-Minute Review first, then compare them
            here side by side.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map(({ applicant, intel, nextAction }, index) => {
            const dueAtSigningAmount = applicant.dueAtSigningAmount || applicant.dueAtSigning || 0;
            const dueAtSigningBreakdown = dueAtSigningAmount
              ? formatDueAtSigningBreakdown({
                  firstMonthRent: applicant.firstMonthRent ?? null,
                  securityDeposit: applicant.securityDeposit ?? null,
                  brokerFee: applicant.brokerFee ?? null,
                  petFee: applicant.petFee ?? null,
                  otherMoveInFees: applicant.otherMoveInFees ?? null,
                })
              : "Needs confirmation";

            return (
            <article
              key={applicant._id}
              className="rounded-[20px] border border-[#b8c4d4] bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.08)]"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                Candidate {index + 1}
              </p>
              <h2 className="mt-2 text-xl font-bold">{applicant.name}</h2>
              <div className="mt-4 grid gap-2">
                {[
                  ["Score", `${intel.score}/100`],
                  ["Readiness", `${intel.readiness}%`],
                  ["Risk", intel.riskLevel],
                  ["Missing items", `${intel.documentsMissing.length}`],
                  [
                    "Due at signing",
                    dueAtSigningAmount
                      ? `$${dueAtSigningAmount.toLocaleString()}`
                      : "Needs confirmation",
                  ],
                  ["Move-in breakdown", dueAtSigningBreakdown],
                  ["Next step", nextAction.nextBestActionLabel],
                  ["Reason", nextAction.nextBestActionReason],
                ].map(([metric, value]) => (
                  <div
                    key={metric}
                    className="rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-3 py-2 text-sm font-semibold"
                  >
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                      {metric}
                    </span>
                    <span className="mt-1 block text-[#071126]">{value}</span>
                  </div>
                ))}
              </div>
            </article>
            );
          })}
        </section>
      )}
    </WorkspacePageShell>
  );
}
