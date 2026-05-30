import { cn } from "@/lib/utils";

type StatusPillProps = {
  tone: "strong" | "review" | "risk" | "neutral";
  children: React.ReactNode;
};

export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]",
        tone === "strong" &&
          "bg-emerald-50 text-[#059669] ring-1 ring-emerald-300",
        tone === "review" &&
          "bg-amber-50 text-[#d97706] ring-1 ring-amber-300",
        tone === "risk" && "bg-rose-50 text-[#dc2626] ring-1 ring-rose-300",
        tone === "neutral" &&
          "bg-slate-100 text-[#334155] ring-1 ring-[#94a3b8]",
      )}
    >
      {children}
    </span>
  );
}
