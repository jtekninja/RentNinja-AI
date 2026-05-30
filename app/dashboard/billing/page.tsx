import { BillingCard } from "@/components/dashboard/billing-card";
import { FeatureCard } from "@/components/dashboard/feature-card";
import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { getDashboardData } from "@/lib/data/dashboard";
import { requireSession } from "@/lib/require-session";
import Link from "next/link";

export default async function BillingPage() {
  const session = await requireSession();
  const data = await getDashboardData(
    session.user.id,
    session.user.organizationId,
  );
  const organization = data.organization;
  const lockedPreviews = [
    ["Pro", "Owner Presentation Mode", "Owner Reports save time when presenting applicants to property owners. Upgrade to Pro to unlock this time-saving workflow."],
    ["Pro", "Messy Info Extractor", "Paste messages, emails, screenshots, or application notes and turn them into clean applicant drafts."],
    ["Pro", "Applicant Comparison", "Compare finalists with score, readiness, missing documents, and objective next steps."],
    ["Business", "PDF Reports", "Create polished export-ready reports for owners, offices, and leasing records."],
    ["Business", "Team Workspace", "Coordinate assignments, statuses, notes, and decisions across your leasing team."],
  ];

  return (
    <WorkspacePageShell
      eyebrow="Billing"
      title="Plans, trial, and usage"
      description="Manage the subscription, see applicant usage, and keep upgrade paths clear on desktop and mobile."
    >
      {organization ? (
        <BillingCard
          organizationName={organization.name}
          plan={organization.plan}
          billingStatus={organization.billingStatus}
          billingEnabled
          hasBillingCustomer={organization.hasBillingCustomer}
        />
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FeatureCard
          label="Gate"
          title="Plan limits"
          description="Applicant creation is limited by plan and returns an upgrade prompt before overage."
        />
        <FeatureCard
          label="Portal"
          title="Stripe customer portal"
          description="When Stripe keys are configured, customers can manage payment methods, invoices, and cancellations."
        />
        <FeatureCard
          label="Demo"
          title="Safe billing fallback"
          description="Missing Stripe credentials show demo mode instead of crashing the app."
        />
      </section>
      <section className="dashboard-card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
          Premium previews
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#050b1f]">
          Locked features should feel useful, not noisy.
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lockedPreviews.map(([plan, title, description]) => (
            <article
              key={title}
              className="rounded-[20px] border border-[#b8c4d4] bg-white p-5 shadow-[0_10px_26px_rgba(15,23,42,0.08)]"
            >
              <span className="rounded-full border border-[#ffb89f] bg-[#fff0ea] px-3 py-1 text-xs font-black text-[#d63a12]">
                Upgrade to {plan}
              </span>
              <h3 className="mt-3 text-xl font-black text-[#050b1f]">
                {title}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
                {description}
              </p>
              <Link
                href="/dashboard/billing"
                className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-[#ff4b1f] px-5 py-2 text-sm font-black text-white shadow-[0_10px_22px_rgba(255,75,31,0.22)] hover:bg-[#e63e16]"
              >
                Upgrade
              </Link>
            </article>
          ))}
        </div>
      </section>
    </WorkspacePageShell>
  );
}
