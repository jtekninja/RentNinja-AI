import { cn } from "@/lib/utils";

type StatusPillProps = {
  tone: "strong" | "review" | "risk" | "neutral";
  children: React.ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        tone === "strong" && "bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-400/20",
        tone === "review" && "bg-amber-300/12 text-amber-100 ring-1 ring-amber-300/20",
        tone === "risk" && "bg-rose-300/12 text-rose-100 ring-1 ring-rose-300/20",
        tone === "neutral" && "bg-white/8 text-slate-200 ring-1 ring-white/10"
      )}
    >
      {children}
    </span>
  );
}

