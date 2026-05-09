import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "Contact | RentNinja AI",
  description: "Contact RentNinja AI and JTekNinja.com.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(247,179,109,0.18),transparent_26%),linear-gradient(180deg,#10131a_0%,#0b0e13_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeader />

        <section className="mt-8 rounded-[34px] border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.34em] text-[#f7b36d]">
            Contact
          </p>
          <h1 className="mt-4 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
            Talk to JTekNinja about RentNinja AI.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            If you want to ask questions, request features, or talk about using
            RentNinja AI in your leasing workflow, reach out directly.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-[#f7b36d]">
                Email
              </p>
              <a
                href="mailto:jtekninja@gmail.com"
                className="mt-3 block text-2xl font-semibold text-white hover:text-[#f7b36d]"
              >
                jtekninja@gmail.com
              </a>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Best for product questions, support requests, business
                inquiries, and feedback.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-[#f7b36d]">
                Next Steps
              </p>
              <div className="mt-3 grid gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-full bg-[#f7b36d] px-5 py-3 text-sm font-semibold text-[#16181d] shadow-[0_14px_30px_rgba(247,179,109,0.22)] transition hover:-translate-y-0.5"
                >
                  Create Workspace
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:-translate-y-0.5"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
