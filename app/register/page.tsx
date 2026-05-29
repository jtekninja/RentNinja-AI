import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import {
  LightPageFrame,
  LightPanel,
} from "@/components/marketing/light-page-frame";

const benefits = [
  "Compare applicants in one organized workspace",
  "Catch red flags before approving a lease",
  "Track every applicant from inquiry to final decision",
];

export default function RegisterPage() {
  return (
    <LightPageFrame>
      <LightPanel>
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
              Create Workspace
            </p>
            <h1 className="mt-4 max-w-4xl text-[2.35rem] font-black leading-[1.02] tracking-tight text-[#070d24] md:text-5xl lg:text-[3.2rem]">
              Start a workspace built to help you screen applicants and choose
              the best tenant faster.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#364154]">
              Organize applications, compare renters, catch red flags early,
              and keep every leasing decision in one place.
            </p>

            <div className="mt-8 grid gap-3">
              {benefits.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[#dbe2ee] bg-white/88 px-4 py-3 text-sm font-semibold text-[#364154] shadow-[0_12px_26px_rgba(31,49,83,0.06)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#dbe2ee] bg-white/88 p-5 shadow-[0_18px_40px_rgba(31,49,83,0.1)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
              Provision account
            </p>
            <h2 className="mt-3 text-3xl font-black text-[#071027]">
              Create RentNinja AI access
            </h2>
            <div className="mt-6">
              <RegisterForm />
            </div>
            <p className="mt-5 text-sm text-[#364154]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-extrabold text-[#071027] transition hover:text-[#ff4f16]"
              >
                Sign in
              </Link>
            </p>
          </section>
        </div>
      </LightPanel>
    </LightPageFrame>
  );
}
