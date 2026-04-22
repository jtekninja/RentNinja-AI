import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/ui/logo";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(247,179,109,0.2),transparent_26%),linear-gradient(180deg,#0f1319_0%,#0a0d12_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl overflow-hidden rounded-[38px] border border-white/10 bg-white/6 shadow-[0_28px_80px_rgba(0,0,0,0.3)] lg:grid-cols-[1fr,0.9fr]">
        <section className="flex flex-col justify-between gap-8 p-6 sm:p-8">
          <div className="space-y-6">
            <Logo />
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.34em] text-[#f7b36d]">Operator Login</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Return to your applicant pipeline and keep decisions moving.
              </h1>
              <p className="max-w-xl text-base text-slate-300">
                RentNinja AI gives each operator a private dashboard scoped to their own applicant records and account context.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Screening totals", "Status tracking", "Red flag review"].map((item) => (
              <div key={item} className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
                {item}
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
    </main>
  );
}
