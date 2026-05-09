"use client";

interface ConfidenceBadgeProps {
  confidence: number;
  showMax?: boolean;
  maxConfidence?: number;
  className?: string;
}

export function ConfidenceBadge({
  confidence,
  showMax = false,
  maxConfidence,
  className = "",
}: ConfidenceBadgeProps) {
  const tone = confidence >= 85 ? "high" : confidence >= 65 ? "medium" : "low";

  const colors = {
    high: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    low: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  };

  const labels = {
    high: "HIGH",
    medium: "MED",
    low: "LOW",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${colors[tone]} ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "high"
            ? "bg-emerald-400"
            : tone === "medium"
              ? "bg-amber-400"
              : "bg-rose-400"
        }`}
      />
      {confidence}%
      {showMax && maxConfidence !== undefined ? ` / ${maxConfidence}% max` : ""}
    </span>
  );
}
