import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAdminData } from "@/lib/data/admin";
import { AdminConsole } from "@/components/admin/admin-console";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "owner") {
    redirect("/dashboard");
  }

  const data = await getAdminData(session.user.organizationId);
  if (!data) {
    redirect("/dashboard");
  }

  return <AdminConsole workspace={data.organization} stats={data.stats} users={data.users} activity={data.activity} currentUserId={session.user.id} />;
}
