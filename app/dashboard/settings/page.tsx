import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { customerTypes } from "@/lib/saas-plans";
import { requireSession } from "@/lib/require-session";

const modeDescriptions: Record<string, string> = {
  "Landlord Mode": "Choose the best tenant and save time.",
  "Realtor Mode": "Create owner summaries and fast follow-ups.",
  "Property Manager Mode": "Manage pipeline, properties, documents, and reports.",
  "Owner Mode": "Review comparison, risk, and readiness simply.",
  "Leasing Agent Mode": "Use field actions, showing notes, and messages from mobile.",
  "Team Mode": "Coordinate assignments, statuses, and collaboration.",
};

export default async function SettingsPage() {
  await requireSession();

  return (
    <WorkspacePageShell
      eyebrow="Settings"
      title="Workspace settings"
      description="Configure customer type, Fair Housing Mode, screening defaults, team access, and billing from a mobile-friendly control center."
    >
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="dashboard-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
            Profile
          </p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-[#071126]">
              <span>Workspace name</span>
              <input className="dashboard-input" placeholder="RentNinja Leasing" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#071126]">
              <span>Customer mode</span>
              <select className="dashboard-input">
                {customerTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-2">
              {customerTypes.map((type) => (
                <div
                  key={type}
                  className="rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-4 py-3"
                >
                  <p className="text-sm font-black text-[#071126]">{type}</p>
                  <p className="mt-1 text-xs font-semibold text-[#334155]">
                    {modeDescriptions[type]}
                  </p>
                </div>
              ))}
            </div>
            <label className="flex min-h-[52px] items-center justify-between gap-3 rounded-[16px] border border-[#b8c4d4] bg-white px-4 py-3 text-sm font-bold text-[#071126]">
              <span>Fair Housing Mode</span>
              <input type="checkbox" defaultChecked className="h-5 w-5 accent-[#ff4b1f]" />
            </label>
          </div>
        </div>
        <div className="dashboard-card p-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
            Sections
          </p>
          <div className="mt-4 grid gap-3">
            {[
              "Properties",
              "Screening criteria",
              "Team",
              "Billing",
              "Branding color",
              "Notification preferences",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3 text-sm font-bold text-[#071126]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </WorkspacePageShell>
  );
}
