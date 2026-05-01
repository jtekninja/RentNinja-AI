import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

const featureCards = [
  {
    title: "Screening totals",
    body: "See how many applicants are strong fits, who needs review, and which files should be declined before you spend more time on them."
  },
  {
    title: "Status tracking",
    body: "Track every applicant from new lead to screening, lease review, approval, or decline so your pipeline stays organized."
  },
  {
    title: "Red flag review",
    body: "Surface affordability issues, weak credit signals, missing documents, and other risk markers automatically."
  },
  {
    title: "Best tenant ranking",
    body: "Compare applicants side by side and highlight the strongest tenant in the bunch based on your screening criteria."
  }
];

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(247,179,109,0.2),transparent_26%),linear-gradient(180deg,#0f1319_0%,#0a0d12_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <SiteHeader />

        <div className="mt-6 grid min-h-[calc(100vh-8rem)] overflow-hidden rounded-[38px] border border-white/10 bg-white/6 shadow-[0_28px_80px_rgba(0,0,0,0.3)] lg:grid-cols-[1fr,0.9fr]">
        <section className="flex flex-col justify-between gap-8 p-6 sm:p-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.34em] text-[#f7b36d]">Operator Login</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Return to your applicant pipeline and choose the best tenant with less guesswork.
              </h1>
              <p className="max-w-xl text-base text-slate-300">
                RentNinja AI gives each operator a private screening workspace to rank applicants, catch red flags early,
                and move from inquiry to lease decision with a cleaner process.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {featureCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4"
              >
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center border-t border-white/10 bg-black/20 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <div className="w-full space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#f7b36d]">Sign in</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Welcome back</h2>
            </div>
            <Suspense fallback={<div className="text-sm text-slate-300">Loading sign-in form...</div>}>
              <LoginForm />
            </Suspense>
            <p className="text-sm text-slate-300">
              Need an account?{" "}
              <Link href="/register" className="font-semibold text-white">
                Create your workspace
              </Link>
            </p>
          </div>
        </section>

        </div>

        <SiteFooter />
      </div>
    </main>
  );
}
