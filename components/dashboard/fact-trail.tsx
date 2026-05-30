"use client";

interface FactTrailProps {
  explainability: {
    rule: string;
    facts: Record<string, unknown>;
    policyThreshold?: unknown;
  }[];
}

export function FactTrail({ explainability }: FactTrailProps) {
  if (explainability.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {explainability.map((item, i) => (
        <div
          key={`${item.rule}-${i}`}
          className="rounded-xl border border-[#b8c4d4] bg-[#f8fafc] px-3 py-2 text-xs font-medium text-[#334155]"
        >
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#475569]">
            Rule: {item.rule}
          </p>
          <div className="mt-1.5 space-y-1">
            {Object.entries(item.facts).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <span className="text-[#475569]">{key}</span>
                <span className="text-right font-mono text-[#071126]">
                  {value === null || value === undefined
                    ? "—"
                    : typeof value === "boolean"
                      ? value
                        ? "yes"
                        : "no"
                      : String(value)}
                </span>
              </div>
            ))}
          </div>
          {item.policyThreshold !== undefined &&
          item.policyThreshold !== null ? (
            <div className="mt-1.5 border-t border-[#b8c4d4] pt-1.5">
              <span className="text-[#475569]">Threshold: </span>
              <span className="font-mono font-bold text-[#d97706]">
                {typeof item.policyThreshold === "object"
                  ? JSON.stringify(item.policyThreshold)
                  : String(item.policyThreshold)}
              </span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
