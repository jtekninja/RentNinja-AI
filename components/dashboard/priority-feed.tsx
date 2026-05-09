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
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">
          Priority Feed
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          All caught up
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          No urgent issues. Your pipeline is healthy.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">
        Priority Feed
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">
        What needs your attention
      </h2>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className={`rounded-[22px] border px-4 py-3 ${
              item.priority === "P0"
                ? "border-rose-300/20 bg-rose-300/8"
                : item.priority === "P1"
                  ? "border-amber-300/15 bg-amber-300/6"
                  : "border-white/8 bg-black/15"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={priorityTone[item.priority]}>
                {typeLabel[item.type] ?? item.type}
              </StatusPill>
              <span className="text-sm font-semibold text-white">
                {item.title}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{item.description}</p>
            <p className="mt-2 text-sm font-medium text-[#f7b36d]">
              {item.suggestedAction}
            </p>
            {item.explainability.length > 0 && (
              <details className="mt-2 text-xs text-slate-400">
                <summary className="cursor-pointer hover:text-slate-300">
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
