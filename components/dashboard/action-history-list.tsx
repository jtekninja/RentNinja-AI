"use client";

interface HistoryAction {
  _id: string;
  actionType: string;
  title: string;
  status: string;
  actedAt?: string;
  overrideReason?: string;
  priority: string;
}

interface ActionHistoryListProps {
  actions: HistoryAction[];
}

export function ActionHistoryList({ actions }: ActionHistoryListProps) {
  const statusIcons: Record<string, string> = {
    accepted: "✓",
    skipped: "↩",
    overridden: "↻",
    auto_applied: "⚡",
    expired: "✕",
  };

  const statusColors: Record<string, string> = {
    accepted: "text-emerald-300",
    skipped: "text-slate-500",
    overridden: "text-amber-300",
    auto_applied: "text-sky-300",
    expired: "text-slate-600",
  };

  return (
    <div className="space-y-1.5">
      {actions.map((action) => (
        <div
          key={action._id}
          className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
        >
          <span
            className={`mt-0.5 text-xs ${statusColors[action.status] ?? "text-slate-400"}`}
          >
            {statusIcons[action.status] ?? "·"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-slate-300 truncate">{action.title}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] uppercase font-semibold ${statusColors[action.status] ?? "text-slate-500"}`}
              >
                {action.status.replace("_", " ")}
              </span>
              {action.actedAt ? (
                <span className="text-[10px] text-slate-600">
                  {new Date(action.actedAt).toLocaleDateString()}
                </span>
              ) : null}
            </div>
            {action.overrideReason ? (
              <p className="mt-1 text-[10px] text-amber-400/70 italic">
                &ldquo;{action.overrideReason}&rdquo;
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
