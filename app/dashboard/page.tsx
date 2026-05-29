import { ApplicantDashboard } from "@/components/dashboard/applicant-dashboard";
import { hasMapboxConfig } from "@/lib/env";

export default function DashboardPage() {
  return (
    <ApplicantDashboard
      initialApplicants={[]}
      organization={null}
      user={{}}
      billingEnabled={false}
      addressLookupEnabled={hasMapboxConfig()}
    />
  );
}
