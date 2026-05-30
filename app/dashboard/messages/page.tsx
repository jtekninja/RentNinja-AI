import { MessageCenter } from "@/components/dashboard/message-center";
import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { requireSession } from "@/lib/require-session";

export default async function MessagesPage() {
  await requireSession();

  return (
    <WorkspacePageShell
      eyebrow="Messages"
      title="Mobile message generator"
      description="Generate, copy, save, and open SMS or email follow-ups from a phone-friendly workflow."
    >
      <MessageCenter />
    </WorkspacePageShell>
  );
}
