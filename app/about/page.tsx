import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export const metadata: Metadata = {
  title: "About | RentNinja AI",
  description: "Learn what RentNinja AI helps property owners and managers do.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(247,179,109,0.18),transparent_24%),linear-gradient(180deg,#10131a_0%,#0b0e13_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <SiteHeader />

        <section className="mt-8 rounded-[34px] border border-white/10 bg-white/5 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.34em] text-[#f7b36d]">
            About RentNinja AI
          </p>
          <h1 className="mt-4 max-w-4xl text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
            Built to help landlords sort through applicants faster and pick the
            right tenant with more confidence.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            RentNinja AI is designed for landlords, property managers, and
            leasing teams who need a cleaner way to compare renters, spot red
            flags, and keep leasing decisions organized from inquiry to
            approval.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              [
                "Compare applicants",
                "Keep every renter in one workspace and quickly see who looks strongest.",
              ],
              [
                "Catch risk early",
                "Surface affordability gaps, weak resident scores, and other warning signs before approval.",
              ],
              [
                "Stay organized",
                "Track notes, statuses, and decisions without juggling spreadsheets, texts, and email threads.",
              ],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-[28px] border border-white/10 bg-black/20 p-5"
              >
                <p className="text-base font-semibold text-white">{title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-[#f7b36d]">
              Who It Serves
            </p>
            <ul className="mt-4 grid gap-3 text-sm text-slate-200">
              <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                Independent landlords screening a handful of applicants
              </li>
              <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                Property managers reviewing multiple renters across units
              </li>
              <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                Leasing teams that want a more consistent decision process
              </li>
            </ul>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-[#f7b36d]">
              What Matters
            </p>
            <ul className="mt-4 grid gap-3 text-sm text-slate-200">
              <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                Speed without losing judgment
              </li>
              <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                A simple way to identify the best tenant in the bunch
              </li>
              <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                A professional workflow that can grow into a full leasing
                business tool
              </li>
            </ul>
          </div>
        </section>

        <SiteFooter />
      </div>
    </main>
  );
}
