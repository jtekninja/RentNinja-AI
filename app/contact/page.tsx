import type { Metadata } from "next";
import Link from "next/link";
import {
  LightPageFrame,
  LightPanel,
} from "@/components/marketing/light-page-frame";

export const metadata: Metadata = {
  title: "Contact | RentNinja AI",
  description: "Contact RentNinja AI and JTekNinja.com.",
};

export default function ContactPage() {
  return (
    <LightPageFrame>
      <LightPanel>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
          Contact
        </p>
        <h1 className="mt-4 max-w-5xl text-[2.35rem] font-black leading-[1.02] tracking-tight text-[#070d24] md:text-5xl lg:text-[3.2rem]">
          Talk to JTekNinja about RentNinja AI.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[#364154]">
          If you want to ask questions, request features, or talk about using
          RentNinja AI in your leasing workflow, reach out directly.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 p-5 shadow-[0_18px_40px_rgba(31,49,83,0.1)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
              Email
            </p>
            <a
              href="mailto:jtekninja@gmail.com"
              className="mt-3 block text-2xl font-black text-[#071027] transition hover:text-[#ff4f16]"
            >
              jtekninja@gmail.com
            </a>
            <p className="mt-3 text-sm leading-6 text-[#364154]">
              Best for product questions, support requests, business inquiries,
              and feedback.
            </p>
          </div>

          <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 p-5 shadow-[0_18px_40px_rgba(31,49,83,0.1)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
              Next Steps
            </p>
            <div className="mt-4 grid gap-3">
              <Link
                href="/register"
                className="inline-flex min-h-[50px] items-center justify-center rounded-2xl bg-[#ff4f16] px-6 text-base font-extrabold text-white shadow-[0_16px_30px_rgba(255,79,22,0.28)] transition hover:-translate-y-0.5"
              >
                Create Workspace
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-[#dbe2ee] bg-white px-6 text-base font-extrabold text-[#071027] transition hover:-translate-y-0.5 hover:text-[#ff4f16]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </LightPanel>
    </LightPageFrame>
  );
}
