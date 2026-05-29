import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import {
  LightPageFrame,
  LightPanel,
} from "@/components/marketing/light-page-frame";

const featureCards = [
  {
    title: "Screening totals",
    body: "See how many applicants are strong fits, who needs review, and which files should be declined before you spend more time on them.",
  },
  {
    title: "Status tracking",
    body: "Track every applicant from new lead to screening, lease review, approval, or decline so your pipeline stays organized.",
  },
  {
    title: "Red flag review",
    body: "Surface affordability issues, weak credit signals, missing documents, and other risk markers automatically.",
  },
  {
    title: "Best tenant ranking",
    body: "Compare applicants side by side and highlight the strongest tenant in the bunch based on your screening criteria.",
  },
];

export default function LoginPage() {
  return (
    <LightPageFrame>
      <LightPanel>
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
              Operator Login
            </p>
            <h1 className="mt-4 max-w-4xl text-[2.35rem] font-black leading-[1.02] tracking-tight text-[#070d24] md:text-5xl lg:text-[3.2rem]">
              Return to your applicant pipeline and choose the best tenant with
              less guesswork.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#364154]">
              RentNinja AI gives each operator a private screening workspace to
              rank applicants, catch red flags early, and move from inquiry to
              lease decision with a cleaner process.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {featureCards.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[20px] border border-[#dbe2ee] bg-white/88 p-4 shadow-[0_14px_30px_rgba(31,49,83,0.08)]"
                >
                  <p className="text-sm font-black text-[#071027]">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#364154]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#dbe2ee] bg-white/88 p-5 shadow-[0_18px_40px_rgba(31,49,83,0.1)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
              Sign in
            </p>
            <h2 className="mt-3 text-3xl font-black text-[#071027]">
              Welcome back
            </h2>
            <div className="mt-6">
              <Suspense
                fallback={
                  <div className="text-sm text-[#364154]">
                    Loading sign-in form...
                  </div>
                }
              >
                <LoginForm />
              </Suspense>
            </div>
            <p className="mt-5 text-sm text-[#364154]">
              Need an account?{" "}
              <Link
                href="/register"
                className="font-extrabold text-[#071027] transition hover:text-[#ff4f16]"
              >
                Create your workspace
              </Link>
            </p>
          </section>
        </div>
      </LightPanel>
    </LightPageFrame>
  );
}
