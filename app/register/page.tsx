import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(92,174,255,0.16),transparent_22%),radial-gradient(circle_at_top_right,rgba(247,179,109,0.18),transparent_24%),linear-gradient(180deg,#0f1319_0%,#090c11_100%)] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
        <SiteHeader />

        <div className="mt-6 grid min-h-[calc(100vh-8rem)] overflow-hidden rounded-[38px] border border-white/10 bg-white/6 shadow-[0_28px_80px_rgba(0,0,0,0.3)] lg:grid-cols-[0.95fr,1.05fr]">
          <section className="border-b border-white/10 bg-black/20 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.34em] text-[#f7b36d]">
                  Create Workspace
                </p>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
                  Start a workspace built to help you screen applicants and
                  choose the best tenant faster.
                </h1>
                <p className="max-w-xl text-base text-slate-300">
                  Organize applications, compare renters, catch red flags early,
                  and keep every leasing decision in one place.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  "Compare applicants in one organized workspace",
                  "Catch red flags before approving a lease",
                  "Track every applicant from inquiry to final decision",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="flex items-center p-6 sm:p-8">
            <div className="w-full space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#f7b36d]">
                  Provision account
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-white">
                  Create RentNinja AI access
                </h2>
              </div>
              <RegisterForm />
              <p className="text-sm text-slate-300">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-white">
                  Sign in
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
