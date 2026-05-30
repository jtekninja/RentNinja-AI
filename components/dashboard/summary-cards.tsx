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
      accent: "text-[#d63a12]",
    },
    {
      label: "Strong Decisions",
      value: summary.strong.toString(),
      accent: "text-[#059669]",
    },
    {
      label: "Manual Review",
      value: summary.review.toString(),
      accent: "text-[#d97706]",
    },
    {
      label: "Risk Cases",
      value: summary.risk.toString(),
      accent: "text-[#dc2626]",
    },
    {
      label: "Average Score",
      value: `${summary.avgScore}/100`,
      accent: "text-[#0369a1]",
    },
    {
      label: "Affordability",
      value: formatPercent(summary.avgAffordability),
      accent: "text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="dashboard-card p-4 transition hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.12)]"
        >
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#334155]">
            {item.label}
          </p>
          <p className={`mt-3 text-3xl font-bold ${item.accent}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
