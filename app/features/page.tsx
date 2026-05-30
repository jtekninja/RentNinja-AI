import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const features = [
  ["Ninja Decision Score", "Score each applicant out of 100 using objective leasing criteria."],
  ["Applicant Readiness Meter", "See who is ready now, almost ready, or missing key items."],
  ["Messy Info Extractor", "Paste texts, screenshots, emails, or application notes into a clean profile."],
  ["Owner Presentation Mode", "Create owner-ready summaries for finalists."],
  ["One-Click Follow-Up", "Generate the right next message based on applicant status."],
  ["Fair Housing Guardrails", "Keep AI suggestions tied to objective criteria and safer workflow language."],
];

const differences = [
  "Built for messy real-world applicant info",
  "Turns texts, screenshots, and notes into clean applicant profiles",
  "Shows the fastest ready candidate",
  "Creates owner-ready reports",
  "Generates professional follow-up messages",
  "Helps users stay organized without spreadsheets",
  "Designed for mobile leasing work",
  "Uses Fair Housing Guardrails for safer decision support",
];

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-[#eaf0f7] px-4 py-6 text-[#071126] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between">
          <Logo />
          <Link className="font-bold text-[#ff4b1f]" href="/pricing">
            Pricing
          </Link>
        </nav>
        <section className="py-10">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
            Features
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-[#050b1f] sm:text-5xl">
            Pick the strongest rental applicant faster.
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-[#334155]">
            RentNinja AI turns messy applications, messages, and documents into
            clear rankings, missing-document checklists, owner reports, and
            follow-up messages.
          </p>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([feature, description]) => (
            <article
              key={feature}
              className="rounded-[22px] border border-[#b8c4d4] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.1)]"
            >
              <h2 className="text-xl font-black text-[#050b1f]">{feature}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
                {description}
              </p>
            </article>
          ))}
        </section>
        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr,0.9fr]">
          <article className="rounded-[22px] border border-[#b8c4d4] bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.1)]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
              Why RentNinja AI is different
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {differences.map((item) => (
                <p
                  key={item}
                  className="rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-4 py-3 text-sm font-bold text-[#334155]"
                >
                  {item}
                </p>
              ))}
            </div>
          </article>
          <article className="rounded-[22px] border border-[#b8c4d4] bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.1)]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
              Demo workflow
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#050b1f]">
              From messy message to leasing decision in 60 seconds
            </h2>
            <ol className="mt-4 grid gap-2">
              {[
                "Paste applicant message",
                "RentNinja extracts key details",
                "AI finds missing documents",
                "Ninja Decision Score ranks applicant",
                "One-click follow-up message is ready",
                "Owner report can be generated",
              ].map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-4 py-3 text-sm font-bold text-[#071126]"
                >
                  {item}
                </li>
              ))}
            </ol>
          </article>
        </section>
      </div>
    </main>
  );
}
