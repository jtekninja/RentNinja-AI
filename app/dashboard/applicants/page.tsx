import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { getApplicantIntelligence } from "@/lib/applicant-intelligence";
import { getDashboardData } from "@/lib/data/dashboard";
import { getNextBestAction } from "@/lib/next-best-action";
import { requireSession } from "@/lib/require-session";

export default async function ApplicantsPage() {
  const session = await requireSession();
  const data = await getDashboardData(
    session.user.id,
    session.user.organizationId,
  );

  return (
    <WorkspacePageShell
      eyebrow="Applicants"
      title="Applicant pipeline"
      description="Review applicants as mobile-readable cards with scores, readiness, missing items, and one next action."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.applicants.length > 0 ? (
          data.applicants.map((applicant) => {
            const intel = getApplicantIntelligence(applicant);
            const nextAction = getNextBestAction(applicant, intel);
            return (
              <article
                key={applicant._id}
                className="rounded-[20px] border border-[#b8c4d4] bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
                      {intel.verdict}
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-[#050b1f]">
                      {applicant.name}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-[#475569]">
                      {applicant.email} | {applicant.phone}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#fff0ea] px-3 py-1 text-sm font-black text-[#d63a12]">
                    {intel.score}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm font-semibold text-[#334155]">
                  <p>Ninja Decision Score: {intel.score}/100</p>
                  <p>
                    Applicant Readiness Meter: {intel.readiness}% |{" "}
                    {intel.readinessLabel}
                  </p>
                  <p>Risk: {intel.riskLevel}</p>
                  <p>Missing items: {intel.documentsMissing.length}</p>
                  <p>What should I do next? {nextAction.nextBestActionLabel}</p>
                  <p className="text-xs text-[#475569]">
                    {nextAction.nextBestActionReason}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#475569]">
                    Smart Missing Docs
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#071126]">
                    {intel.documentsMissing.slice(0, 3).join(", ") ||
                      "No missing documents detected."}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    className="min-h-[44px] rounded-full bg-[#ff4b1f] px-4 py-2 text-sm font-bold text-white hover:bg-[#e63e16]"
                    href={`/dashboard/applicants/${applicant._id}`}
                  >
                    Review
                  </a>
                  <a
                    className="min-h-[44px] rounded-full border border-[#94a3b8] bg-white px-4 py-2 text-sm font-bold text-[#071126] hover:border-[#ff4b1f] hover:bg-[#fff0ea]"
                    href="/dashboard/messages"
                  >
                    {nextAction.nextBestActionButton}
                  </a>
                  <a
                    className="min-h-[44px] rounded-full border border-[#94a3b8] bg-white px-4 py-2 text-sm font-bold text-[#071126] hover:border-[#ff4b1f] hover:bg-[#fff0ea]"
                    href="/dashboard/messages"
                  >
                    Request Docs
                  </a>
                  <a
                    className="min-h-[44px] rounded-full border border-[#94a3b8] bg-white px-4 py-2 text-sm font-bold text-[#071126] hover:border-[#ff4b1f] hover:bg-[#fff0ea]"
                    href={`tel:${applicant.phone}`}
                  >
                    Call
                  </a>
                </div>
              </article>
            );
          })
        ) : (
          <div className="dashboard-card p-5">
            <p className="text-lg font-bold text-[#050b1f]">
              No applicants yet.
            </p>
            <p className="mt-2 text-sm font-semibold text-[#334155]">
              Start with one applicant. Paste applicant info, upload a packet,
              or enter details manually.
            </p>
          </div>
        )}
      </section>
    </WorkspacePageShell>
  );
}
