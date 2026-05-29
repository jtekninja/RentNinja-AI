"use client";

import { useState } from "react";

interface HistoryAction {
  _id: string;
  actionType: string;
  title: string;
  status: string;
  actedAt?: string;
  overrideReason?: string;
  priority: string;
  outcome?: string | null;
  outcomeNote?: string | null;
}

interface ActionHistoryListProps {
  actions: HistoryAction[];
  onFeedback?: (
    actionId: string,
    outcome: "positive" | "negative" | "neutral",
    note?: string,
  ) => Promise<void>;
}

export function ActionHistoryList({
  actions,
  onFeedback,
}: ActionHistoryListProps) {
  const [feedbackPending, setFeedbackPending] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

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

  async function handleFeedback(
    actionId: string,
    outcome: "positive" | "negative" | "neutral",
  ) {
    if (!onFeedback) return;
    setFeedbackPending(actionId);
    try {
      await onFeedback(actionId, outcome, noteText || undefined);
      setNoteText("");
      setExpandedNoteId(null);
    } finally {
      setFeedbackPending(null);
    }
  }

  return (
    <div className="space-y-1.5">
      {actions.map((action) => {
        const hasFeedback =
          action.outcome !== null && action.outcome !== undefined;
        const outcomeLabel =
          action.outcome === "positive"
            ? "Helpful"
            : action.outcome === "negative"
              ? "Not helpful"
              : action.outcome === "neutral"
                ? "Neutral"
                : null;

        return (
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
                {outcomeLabel ? (
                  <span
                    className={`text-[10px] font-semibold ${
                      action.outcome === "positive"
                        ? "text-emerald-400"
                        : action.outcome === "negative"
                          ? "text-rose-400"
                          : "text-slate-400"
                    }`}
                  >
                    {outcomeLabel}
                  </span>
                ) : null}
              </div>
              {action.overrideReason ? (
                <p className="mt-1 text-[10px] text-amber-400/70 italic">
                  &ldquo;{action.overrideReason}&rdquo;
                </p>
              ) : null}
            </div>

            {/* Feedback buttons — only shown when onFeedback is provided and no feedback given yet */}
            {onFeedback && !hasFeedback ? (
              <div className="flex flex-shrink-0 items-center gap-1 ml-2">
                {feedbackPending === action._id ? (
                  <span className="text-[10px] text-slate-500">...</span>
                ) : (
                  <>
                    <button
                      onClick={() => handleFeedback(action._id, "positive")}
                      disabled={feedbackPending === action._id}
                      className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-1.5 py-0.5 text-[10px] text-emerald-300 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
                      title="Mark as helpful"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        if (expandedNoteId === action._id) {
                          setExpandedNoteId(null);
                          setNoteText("");
                        } else {
                          setExpandedNoteId(action._id);
                          setNoteText("");
                        }
                      }}
                      disabled={feedbackPending === action._id}
                      className="rounded-full border border-amber-400/20 bg-amber-400/8 px-1.5 py-0.5 text-[10px] text-amber-300 hover:bg-amber-400/20 transition-colors disabled:opacity-50"
                      title="Add note or neutral feedback"
                    >
                      ...
                    </button>
                    <button
                      onClick={() => handleFeedback(action._id, "negative")}
                      disabled={feedbackPending === action._id}
                      className="rounded-full border border-rose-400/20 bg-rose-400/8 px-1.5 py-0.5 text-[10px] text-rose-300 hover:bg-rose-400/20 transition-colors disabled:opacity-50"
                      title="Mark as not helpful"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {/* Expanded note input */}
            {expandedNoteId === action._id && !hasFeedback ? (
              <div className="w-full mt-2 flex items-center gap-2">
                <input
                  className="dark-field flex-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-[#f7b36d]/60"
                  placeholder="Optional note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button
                  onClick={() => handleFeedback(action._id, "neutral")}
                  disabled={feedbackPending === action._id}
                  className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
