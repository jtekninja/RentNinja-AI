import { ApplicantDashboard } from "@/components/dashboard/applicant-dashboard";

export default function DashboardPage() {
  return (
    <ApplicantDashboard
      initialApplicants={[]}
      organization={null}
      user={{}}
      billingEnabled={false}
      addressLookupEnabled={false}
    />
  );
}
