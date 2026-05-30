"use client";

import { StatusPill } from "@/components/ui/status-pill";
import type { OperationItem } from "@/lib/ai-operations";

type PriorityFeedProps = {
  items: OperationItem[];
};

const priorityTone = {
  P0: "risk" as const,
  P1: "review" as const,
  P2: "neutral" as const,
  info: "neutral" as const,
};

const typeLabel: Record<string, string> = {
  urgent: "Urgent",
  action: "Action",
  bottleneck: "Bottleneck",
  automation: "Automation",
  tip: "Tip",
};

export function PriorityFeed({ items }: PriorityFeedProps) {
  if (items.length === 0) {
    return (
      <section className="dashboard-card p-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff4b1f]">
          Priority Feed
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#071126]">
          All caught up
        </h2>
        <p className="mt-2 text-base font-medium text-[#334155]">
          No urgent issues. Your pipeline is healthy.
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard-card p-6">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff4b1f]">
        Priority Feed
      </p>
      <h2 className="mt-2 text-2xl font-bold text-[#071126]">
        What needs your attention
      </h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className={`rounded-[22px] border px-4 py-3 ${
              item.priority === "P0"
                ? "border-rose-300 bg-rose-50"
                : item.priority === "P1"
                  ? "border-amber-300 bg-amber-50"
                : "border-[#b8c4d4] bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={priorityTone[item.priority]}>
                {typeLabel[item.type] ?? item.type}
              </StatusPill>
              <span className="text-sm font-bold text-[#071126]">
                {item.title}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium leading-6 text-[#334155]">
              {item.description}
            </p>
            <p className="mt-2 text-sm font-bold text-[#d63a12]">
              {item.suggestedAction}
            </p>
            {item.explainability.length > 0 && (
              <details className="mt-2 text-xs font-medium text-[#334155]">
                <summary className="cursor-pointer font-semibold hover:text-[#071126]">
                  Why this matters
                </summary>
                <ul className="mt-1 ml-4 list-disc space-y-0.5">
                  {item.explainability.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
