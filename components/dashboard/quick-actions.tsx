import Link from "next/link";

const actions = [
  {
    href: "/dashboard/new",
    label: "Add Applicant",
    description: "Quick add essentials or open the full screening form.",
  },
  {
    href: "/dashboard/ai#one-minute",
    label: "Upload/Paste Applicant Info",
    description: "Use the 1-Minute Decision and Messy Info Extractor.",
  },
  {
    href: "/dashboard/compare",
    label: "Compare Applicants",
    description: "Rank 2-5 candidates with mobile cards.",
  },
  {
    href: "/dashboard/messages",
    label: "Generate Message",
    description: "Create follow-ups for applicants or owners.",
  },
  {
    href: "/dashboard/reports",
    label: "Send Owner Report",
    description: "Prepare an owner-ready applicant summary.",
  },
];

export function QuickActions() {
  return (
    <section className="dashboard-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
            Quick actions
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#050b1f]">
            Five simple ways to move leasing forward
          </h2>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="min-h-[112px] rounded-[18px] border border-[#b8c4d4] bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-[#ff4b1f] hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
          >
            <p className="text-base font-bold text-[#071126]">{action.label}</p>
            <p className="mt-2 text-sm font-semibold leading-5 text-[#475569]">
              {action.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
