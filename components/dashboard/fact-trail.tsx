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
          className="rounded-xl border border-white/6 bg-black/20 px-3 py-2 text-xs text-slate-400"
        >
          <p className="font-mono text-[11px] text-slate-500 uppercase tracking-wider">
            Rule: {item.rule}
          </p>
          <div className="mt-1.5 space-y-1">
            {Object.entries(item.facts).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3">
                <span className="text-slate-500">{key}</span>
                <span className="font-mono text-slate-300 text-right">
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
            <div className="mt-1.5 border-t border-white/5 pt-1.5">
              <span className="text-slate-500">Threshold: </span>
              <span className="font-mono text-amber-300/80">
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
