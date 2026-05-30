import { NewApplicantWorkspace } from "@/components/dashboard/new-applicant-workspace";
import { getDashboardData } from "@/lib/data/dashboard";
import { hasMapboxConfig } from "@/lib/env";
import { requireSession } from "@/lib/require-session";

export default async function NewApplicantPage() {
  const session = await requireSession();
  const data = await getDashboardData(
    session.user.id,
    session.user.organizationId,
  );

  return (
    <NewApplicantWorkspace
      defaultPropertyCity={
        data.organization?.complianceSettings.defaultPropertyCity ?? ""
      }
      defaultPropertyState={
        data.organization?.complianceSettings.defaultPropertyState ?? ""
      }
      addressLookupEnabled={hasMapboxConfig()}
    />
  );
}
