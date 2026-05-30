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
    accepted: "text-emerald-700",
    skipped: "text-[#475569]",
    overridden: "text-amber-700",
    auto_applied: "text-sky-700",
    expired: "text-[#475569]",
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
              className={`mt-0.5 text-xs ${statusColors[action.status] ?? "text-[#475569]"}`}
            >
              {statusIcons[action.status] ?? "·"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[#071126]">
                {action.title}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase ${statusColors[action.status] ?? "text-[#475569]"}`}
                >
                  {action.status.replace("_", " ")}
                </span>
                {action.actedAt ? (
                  <span className="text-[10px] font-medium text-[#475569]">
                    {new Date(action.actedAt).toLocaleDateString()}
                  </span>
                ) : null}
                {outcomeLabel ? (
                  <span
                    className={`text-[10px] font-semibold ${
                      action.outcome === "positive"
                        ? "text-[#059669]"
                        : action.outcome === "negative"
                          ? "text-[#dc2626]"
                          : "text-[#475569]"
                    }`}
                  >
                    {outcomeLabel}
                  </span>
                ) : null}
              </div>
              {action.overrideReason ? (
                <p className="mt-1 text-[10px] italic text-amber-700">
                  &ldquo;{action.overrideReason}&rdquo;
                </p>
              ) : null}
            </div>

            {/* Feedback buttons — only shown when onFeedback is provided and no feedback given yet */}
            {onFeedback && !hasFeedback ? (
              <div className="flex flex-shrink-0 items-center gap-1 ml-2">
                {feedbackPending === action._id ? (
                  <span className="text-[10px] text-[#475569]">...</span>
                ) : (
                  <>
                    <button
                      onClick={() => handleFeedback(action._id, "positive")}
                      disabled={feedbackPending === action._id}
                      className="rounded-full border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-[#059669] transition-colors hover:bg-emerald-100 disabled:opacity-80"
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
                      className="rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-[#d97706] transition-colors hover:bg-amber-100 disabled:opacity-80"
                      title="Add note or neutral feedback"
                    >
                      ...
                    </button>
                    <button
                      onClick={() => handleFeedback(action._id, "negative")}
                      disabled={feedbackPending === action._id}
                      className="rounded-full border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-[#dc2626] transition-colors hover:bg-rose-100 disabled:opacity-80"
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
                  className="flex-1 rounded-lg border border-[#94a3b8] bg-white px-2 py-1 text-xs font-medium text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f]"
                  placeholder="Optional note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button
                  onClick={() => handleFeedback(action._id, "neutral")}
                  disabled={feedbackPending === action._id}
                  className="rounded-full border border-[#94a3b8] bg-white px-2 py-1 text-[10px] font-bold text-[#334155] transition-colors hover:border-[#ff4b1f] hover:bg-[#f8fafc] hover:text-[#ff4b1f] disabled:opacity-80"
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
