import { FeatureCard } from "@/components/dashboard/feature-card";
import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { requireSession } from "@/lib/require-session";

const propertyFields = [
  "Property nickname",
  "Address",
  "Unit type",
  "Monthly rent",
  "Utilities included",
  "Max occupancy",
  "Pet policy",
  "Smoking policy",
  "Required documents",
  "Screening criteria",
  "Notes",
];

export default async function PropertiesPage() {
  await requireSession();

  return (
    <WorkspacePageShell
      eyebrow="Properties"
      title="Multi-property workspace"
      description="Store property rules and screening defaults so applicants can be reviewed against the right unit."
    >
      <section className="dashboard-card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {propertyFields.map((field) => (
            <label
              key={field}
              className="grid gap-2 text-sm font-bold text-[#071126]"
            >
              <span>{field}</span>
              <input
                className="min-h-[48px] rounded-[14px] border border-[#94a3b8] bg-white px-4 py-3 text-base font-semibold text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f] focus:shadow-[0_0_0_3px_rgba(255,75,31,0.22)]"
                placeholder={`Enter ${field.toLowerCase()}`}
              />
            </label>
          ))}
        </div>
        <button className="mt-5 min-h-[44px] rounded-full bg-[#ff4b1f] px-5 py-2 text-sm font-bold text-white shadow-[0_10px_22px_rgba(255,75,31,0.22)] hover:bg-[#e63e16]">
          Save property
        </button>
      </section>
      <FeatureCard
        label="Architecture"
        title="Property model added"
        description="The backend now has a Property model ready for persisted multi-property support."
      />
    </WorkspacePageShell>
  );
}
