import { ApplicantDashboard } from "@/components/dashboard/applicant-dashboard";
import { getDashboardData } from "@/lib/data/dashboard";
import { hasMapboxConfig } from "@/lib/env";
import { requireSession } from "@/lib/require-session";

export default async function DashboardPage() {
  const session = await requireSession();
  const data = await getDashboardData(
    session.user.id,
    session.user.organizationId,
  );

  return (
    <ApplicantDashboard
      initialApplicants={data.applicants}
      organization={data.organization}
      user={session.user}
    />
  );
}
