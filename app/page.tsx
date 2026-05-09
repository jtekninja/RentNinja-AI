import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(247,179,109,0.22),transparent_26%),radial-gradient(circle_at_80%_10%,rgba(120,154,255,0.18),transparent_22%),linear-gradient(180deg,#10131a_0%,#0b0e13_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeader />

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.1fr,0.9fr] lg:py-12">
          <div className="space-y-7">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.38em] text-[#f7b36d]">
                RentNinja AI
              </p>
              <h1 className="max-w-4xl text-3xl md:text-4xl lg:text-5xl font-semibold leading-none tracking-tight text-white">
                Automated tenant screening that helps landlords compare
                applicants and choose the best renter with confidence.
              </h1>
              <p className="max-w-2xl text-lg text-slate-200">
                Score every applicant, rank the strongest tenants, flag risky
                files, track status from lead to lease, and keep every property
                team&apos;s records organized inside one mobile-ready workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className={buttonLinkClasses("primary", "px-5 py-3")}
              >
                Create Workspace
              </Link>
            </div>

            <p className="text-sm text-slate-300">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-white transition hover:text-[#f7b36d]"
              >
                Sign in
              </Link>
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [
                  "Best tenant ranking",
                  "Automatically compare the whole applicant pool and push the strongest matches to the top.",
                ],
                [
                  "Red flag detection",
                  "Spot affordability problems, weak credit, and incomplete files before approving a lease.",
                ],
                [
                  "Status tracking",
                  "Move applicants from new lead to review, approval, and signed lease without losing the thread.",
                ],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm text-slate-300">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.32)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(247,179,109,0.2),transparent_36%)]" />
            <div className="relative grid gap-4">
              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                  Live Pipeline Snapshot
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Metric label="Strong" value="28" tone="text-emerald-200" />
                  <Metric label="Review" value="11" tone="text-amber-100" />
                  <Metric label="Risk" value="4" tone="text-rose-100" />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                      Applicant Decision
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Nina Patel
                    </h2>
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/12 px-4 py-2 text-sm font-semibold text-emerald-100">
                    Strong
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Metric
                    label="Total score"
                    value="84 / 100"
                    tone="text-white"
                  />
                  <Metric
                    label="Affordability"
                    value="3.6x rent"
                    tone="text-white"
                  />
                  <Metric label="Credit score" value="742" tone="text-white" />
                  <Metric
                    label="Lease status"
                    value="Draft"
                    tone="text-white"
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">
                  Why teams use it
                </p>
                <ul className="mt-4 grid gap-3 text-sm text-slate-100">
                  <li className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    Rank the best tenant in a crowded applicant pool
                  </li>
                  <li className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    Use automated scoring to make faster leasing decisions
                  </li>
                  <li className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                    Keep every applicant, note, and decision inside one
                    workspace
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
        {label}
      </p>
      <p className={`mt-2 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function buttonLinkClasses(
  variant: "primary" | "secondary" | "ghost",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5",
    variant === "primary" &&
      "bg-[#f7b36d] text-[#16181d] shadow-[0_14px_30px_rgba(247,179,109,0.22)]",
    variant === "secondary" && "bg-white/10 text-white ring-1 ring-white/10",
    variant === "ghost" && "bg-transparent text-white ring-1 ring-white/10",
    className,
  );
}
