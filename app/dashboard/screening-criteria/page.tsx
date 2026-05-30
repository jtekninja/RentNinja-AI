import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { requireSession } from "@/lib/require-session";

export default async function ScreeningCriteriaPage() {
  await requireSession();

  return (
    <WorkspacePageShell
      eyebrow="Screening Criteria"
      title="Criteria builder"
      description="Build objective, property-specific criteria for rent, documents, occupancy, pets, smoking, and voucher handling."
    >
      <section className="dashboard-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            "Property type",
            "Rent amount",
            "Utilities included",
            "Occupancy rules",
            "Pet policy",
            "Smoking policy",
            "Income requirement",
            "Credit preference",
            "Required documents",
            "Voucher handling process",
          ].map((field) => (
            <label
              key={field}
              className="grid gap-2 text-sm font-bold text-[#071126]"
            >
              <span>{field}</span>
              <input
                className="dashboard-input"
                placeholder={`Enter ${field.toLowerCase()}`}
              />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="min-h-[44px] rounded-full bg-[#ff4b1f] px-5 py-2 text-sm font-bold text-white shadow-[0_10px_22px_rgba(255,75,31,0.22)] hover:bg-[#e63e16]">
            Generate criteria
          </button>
          <button className="min-h-[44px] rounded-full border border-[#94a3b8] bg-white px-5 py-2 text-sm font-bold text-[#071126] hover:border-[#ff4b1f] hover:bg-[#fff0ea]">
            Save criteria
          </button>
        </div>
      </section>
    </WorkspacePageShell>
  );
}
