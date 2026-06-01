import { OneMinuteDecision } from "@/components/dashboard/one-minute-decision";
import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";
import { auth } from "@/auth";
import { hasOpenAIConfig } from "@/lib/openai";
import Link from "next/link";
import { redirect } from "next/navigation";

const tools = [
  {
    title: "1-Minute Applicant Review",
    description:
      "Paste a messy message and turn it into a clean applicant summary with score, readiness, missing docs, and next step.",
    href: "#one-minute",
  },
  {
    title: "Messy Info Extractor",
    description:
      "Paste texts, emails, or screenshots and extract clean applicant details automatically.",
    href: "#extractor",
  },
  {
    title: "Generate Follow-Up Message",
    description:
      "Get a professional follow-up message drafted for any applicant in one click.",
    href: "/dashboard/messages",
  },
  {
    title: "Compare Applicants",
    description:
      "Rank multiple applicants side by side using objective criteria and clear next steps.",
    href: "/dashboard/compare",
  },
  {
    title: "Create Owner Report",
    description:
      "Prepare a clean owner-ready summary with strengths, concerns, and missing items.",
    href: "/dashboard/reports",
  },
] as const;

export default async function AiAssistantPage() {
  let demoMode = true;
  let pageWarning = "";
  let shouldRedirectToLogin = false;

  try {
    const session = await auth();

    if (!session?.user) {
      shouldRedirectToLogin = true;
    } else {
      demoMode = !hasOpenAIConfig();
      if (demoMode) {
        pageWarning = "AI service not configured. Add OPENAI_API_KEY to enable live AI.";
      }
    }
  } catch (error) {
    console.error('Route "/dashboard/ai" failed during server render:', {
      message: error instanceof Error ? error.message : String(error),
    });
    pageWarning =
      "AI Dashboard could not load all account services. The AI tools are still available in demo mode.";
  }

  if (shouldRedirectToLogin) {
    redirect("/login");
  }

  return (
    <WorkspacePageShell
      eyebrow="AI Tools"
      title="Speed up your review"
      description="One clean place for applicant review, info extraction, messaging, comparison, and owner reports."
    >
      {/* ── Status badge ── */}
      <div className="flex items-center gap-2">
        <span className={`pill ${demoMode ? "pill-warning" : "pill-success"}`}>
          {demoMode ? "Demo AI mode" : "AI Connected"}
        </span>
        {demoMode && (
          <span className="text-xs text-[#475569] font-medium">
            AI service not configured
          </span>
        )}
      </div>
      {pageWarning ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {pageWarning}
        </div>
      ) : null}

      {/* ── 1-Minute Review ── */}
      <OneMinuteDecision />

      {/* ── Tool cards ── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.title}
            href={tool.href}
            className="card-inner p-5 transition hover:border-[#ff4b1f] hover:shadow-[0_8px_24px_rgba(255,75,31,0.08)]"
          >
            <h3 className="text-base font-bold">{tool.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              {tool.description}
            </p>
            <span className="mt-3 inline-block text-sm font-bold text-[#ff4b1f]">
              Open -&gt;
            </span>
          </Link>
        ))}
      </section>
    </WorkspacePageShell>
  );
}
