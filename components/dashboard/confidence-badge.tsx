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
    high: "border-emerald-300 bg-emerald-50 text-[#059669]",
    medium: "border-amber-300 bg-amber-50 text-[#d97706]",
    low: "border-rose-300 bg-rose-50 text-[#dc2626]",
  };

  const labels = {
    high: "HIGH",
    medium: "MED",
    low: "LOW",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${colors[tone]} ${className}`}
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
