import { formatPercent } from "@/lib/utils";

type SummaryCardsProps = {
  summary: {
    total: number;
    strong: number;
    review: number;
    risk: number;
    avgScore: number;
    avgAffordability: number;
  };
};

export function SummaryCards({ summary }: SummaryCardsProps) {
  const items = [
    {
      label: "Applicants",
      value: summary.total.toString(),
      accent: "from-[#f7b36d]/20 to-transparent",
    },
    {
      label: "Strong Decisions",
      value: summary.strong.toString(),
      accent: "from-emerald-400/20 to-transparent",
    },
    {
      label: "Manual Review",
      value: summary.review.toString(),
      accent: "from-amber-300/20 to-transparent",
    },
    {
      label: "Risk Cases",
      value: summary.risk.toString(),
      accent: "from-rose-300/20 to-transparent",
    },
    {
      label: "Average Score",
      value: `${summary.avgScore}/100`,
      accent: "from-sky-300/20 to-transparent",
    },
    {
      label: "Affordability",
      value: formatPercent(summary.avgAffordability),
      accent: "from-violet-300/20 to-transparent",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className={`overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]`}
        >
          <div
            className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${item.accent}`}
          />
          <p className="relative text-xs uppercase tracking-[0.24em] text-slate-300">
            {item.label}
          </p>
          <p className="relative mt-3 text-2xl font-semibold text-white">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
