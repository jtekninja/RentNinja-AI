import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDashboardData } from "@/lib/data/dashboard";
import { hasMapboxConfig, hasStripeConfig } from "@/lib/env";
import { ApplicantDashboard } from "@/components/dashboard/applicant-dashboard";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const data = await getDashboardData(session.user.id, session.user.organizationId);

  return (
    <ApplicantDashboard
      initialApplicants={data.applicants}
      organization={data.organization}
      user={{ name: session.user.name, email: session.user.email, role: session.user.role }}
      billingEnabled={hasStripeConfig()}
      addressLookupEnabled={hasMapboxConfig()}
    />
  );
}
