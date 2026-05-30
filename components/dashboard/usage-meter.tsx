import Link from "next/link";
import { getApplicantUsage, getPlan } from "@/lib/saas-plans";

type UsageMeterProps = {
  plan?: string | null;
  billingStatus?: string | null;
  applicantCount: number;
};

export function UsageMeter({
  plan,
  billingStatus,
  applicantCount,
}: UsageMeterProps) {
  const currentPlan = getPlan(plan);
  const usage = getApplicantUsage(applicantCount, currentPlan.key);

  return (
    <section className="dashboard-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
            Plan and usage
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#050b1f]">
            {currentPlan.name} workspace
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#334155]">
            Status: {billingStatus || "demo"} ·{" "}
            {usage.isUnlimited
              ? "Unlimited applicants"
              : `${usage.count} of ${usage.limit} applicants used`}
          </p>
        </div>
        <Link
          href="/dashboard/billing"
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#94a3b8] bg-white px-5 py-2 text-sm font-bold text-[#071126] shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:border-[#ff4b1f] hover:bg-[#fff0ea] hover:text-[#ff4b1f]"
        >
          Manage billing
        </Link>
      </div>

      {!usage.isUnlimited ? (
        <div className="mt-4">
          <div className="h-3 overflow-hidden rounded-full border border-[#b8c4d4] bg-[#e8eef6]">
            <div
              className="h-full rounded-full bg-[#ff4b1f]"
              style={{ width: `${usage.ratio}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-[#475569]">
            {usage.remaining} applicant slots remaining this month.
          </p>
        </div>
      ) : null}
    </section>
  );
}
