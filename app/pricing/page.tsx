import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const plans = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For small landlords organizing applicants faster.",
    features: [
      "Up to 20 active applicants",
      "AI applicant summaries",
      "Document checklist",
      "Basic scoring",
      "Email support",
    ],
    href: "/register",
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    description:
      "For active landlords and realtors who want AI review, comparison, and owner reports.",
    features: [
      "Up to 100 active applicants",
      "1-Minute AI Review",
      "Applicant comparison",
      "Owner reports",
      "Follow-up message generator",
      "Priority support",
    ],
    href: "/register",
    highlight: true,
  },
  {
    name: "Business",
    price: "$149",
    period: "/month",
    description:
      "For property managers and leasing teams managing multiple properties.",
    features: [
      "Up to 500 active applicants",
      "Everything in Pro",
      "Team workspace (5 seats)",
      "PDF reports",
      "Messy Info Extractor",
      "Phone support",
    ],
    href: "/register",
  },
  {
    name: "Agency",
    price: "$299",
    period: "/month",
    description: "For real estate offices and portfolio operators.",
    features: [
      "Unlimited applicants",
      "Everything in Business",
      "Unlimited team seats",
      "Custom integrations",
      "Dedicated support",
    ],
    href: "/contact",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#e8eef6] px-4 py-6 text-[#071126] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between">
          <Logo />
          <Link href="/login" className="btn-secondary text-sm">
            Sign in
          </Link>
        </nav>

        <section className="py-12 text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
            Pricing
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Simple pricing for faster decisions
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#475569]">
            Every plan includes AI applicant summaries, document checklists,
            scoring, and Fair Housing compliance.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`card p-6 flex flex-col ${
                plan.highlight
                  ? "border-[#ff4b1f] ring-1 ring-[#ff4b1f] shadow-[0_8px_30px_rgba(255,75,31,0.12)]"
                  : ""
              }`}
            >
              {plan.highlight && (
                <span className="pill pill-info mb-3 self-start">
                  Most popular
                </span>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <div className="mt-2">
                <span className="text-3xl font-black text-[#ff4b1f]">
                  {plan.price}
                </span>
                <span className="text-sm font-medium text-[#475569]">
                  {plan.period}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#475569]">
                {plan.description}
              </p>
              <ul className="mt-5 flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-[#334155]"
                  >
                    <span className="mt-0.5 shrink-0 text-[#059669]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`mt-6 flex min-h-[46px] w-full items-center justify-center rounded-full text-sm font-bold ${
                  plan.highlight ? "btn-primary" : "btn-secondary"
                }`}
              >
                {plan.name === "Agency" ? "Contact us" : "Get started"}
              </Link>
            </article>
          ))}
        </section>

        <div className="mt-8 rounded-xl border border-[#b8c4d4] bg-white px-5 py-4 text-center text-sm text-[#475569]">
          All plans include Fair Housing compliance guardrails. No long-term
          contracts — cancel anytime.
        </div>
      </div>
    </main>
  );
}
