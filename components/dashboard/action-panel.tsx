"use client";

import { useState, useEffect } from "react";
import { ActionCard } from "@/components/dashboard/action-card";
import { ActionHistoryList } from "@/components/dashboard/action-history-list";

interface ActionData {
  _id: string;
  actionType: string;
  title: string;
  description: string;
  suggestedAction: string;
  priority: "P0" | "P1" | "P2" | "info";
  confidence: number;
  maxConfidence: number;
  explainability: {
    rule: string;
    facts: Record<string, unknown>;
    policyThreshold?: unknown;
  }[];
  automationSafe: boolean;
  automationAvailable: boolean;
  status: string;
  actedAt?: string;
  overrideReason?: string;
  outcome?: string | null;
  outcomeNote?: string | null;
}

interface ActionPanelProps {
  applicantId: string;
  expanded: boolean;
  onToggle: () => void;
}

export function ActionPanel({
  applicantId,
  expanded,
  onToggle,
}: ActionPanelProps) {
  const [actions, setActions] = useState<ActionData[]>([]);
  const [history, setHistory] = useState<ActionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionPending, setActionPending] = useState<string | null>(null);

  // Generate or load actions when expanded
  useEffect(() => {
    if (!expanded) return;
    if (actions.length > 0) return; // already loaded

    async function loadActions() {
      setLoading(true);
      setError("");
      try {
        // Generate fresh actions
        const genRes = await fetch(`/api/actions/generate/${applicantId}`, {
          method: "POST",
        });
        const genData = await genRes.json();

        if (genRes.ok && genData.actions) {
          setActions(
            genData.actions.filter((a: ActionData) => a.status === "pending"),
          );
        }

        // Load history
        const histRes = await fetch(`/api/actions/history/${applicantId}`);
        const histData = await histRes.json();
        if (histRes.ok && histData.actions) {
          setHistory(
            histData.actions.filter((a: ActionData) => a.status !== "pending"),
          );
        }
      } catch {
        setError("Unable to load actions.");
      } finally {
        setLoading(false);
      }
    }

    loadActions();
  }, [expanded, applicantId, actions.length]);

  async function handleAction(
    actionId: string,
    outcome: "accepted" | "skipped" | "overridden",
    overrideReason?: string,
  ) {
    setActionPending(actionId);
    try {
      const res = await fetch(`/api/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outcome,
          overrideReason: overrideReason ?? undefined,
          overrideActionTaken:
            outcome === "overridden" ? "Manual override" : undefined,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        // Remove from pending actions
        setActions((prev) => prev.filter((a) => a._id !== actionId));
        // Add to history
        setHistory((prev) => [updated, ...prev]);
      } else {
        const err = await res.json();
        setError(err.message || "Failed to update action.");
      }
    } catch {
      setError("Network error while updating action.");
    } finally {
      setActionPending(null);
    }
  }

  async function handleFeedback(
    actionId: string,
    outcome: "positive" | "negative" | "neutral",
    note?: string,
  ) {
    try {
      const res = await fetch(`/api/actions/${actionId}/feedback`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, outcomeNote: note }),
      });
      if (res.ok) {
        const updated = await res.json();
        setHistory((prev) =>
          prev.map((h) => (h._id === actionId ? { ...h, ...updated } : h)),
        );
      }
    } catch {
      // silently fail — feedback is best-effort
    }
  }

  return (
    <div className="mt-3 border-t border-white/8 pt-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#f7b36d] hover:text-[#f9c97a] transition-colors"
      >
        <span>{expanded ? "−" : "＋"}</span>
        Next Best Actions
        {actions.length > 0 ? (
          <span className="rounded-full bg-[#f7b36d]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#f7b36d]">
            {actions.length}
          </span>
        ) : null}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3">
          {error ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-300/8 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-[22px] border border-white/8 bg-black/10 px-4 py-3"
                >
                  <div className="h-3 w-16 rounded-full bg-white/10" />
                  <div className="mt-2 h-4 w-3/4 rounded bg-white/10" />
                  <div className="mt-1 h-3 w-1/2 rounded bg-white/5" />
                </div>
              ))}
            </div>
          ) : actions.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">
              No pending actions for this applicant.
            </p>
          ) : (
            actions.map((action) => (
              <ActionCard
                key={action._id}
                action={action}
                pending={actionPending === action._id}
                onAccept={() => handleAction(action._id, "accepted")}
                onSkip={() => handleAction(action._id, "skipped")}
                onOverride={async (reason, _actionTaken) =>
                  handleAction(action._id, "overridden", reason)
                }
              />
            ))
          )}

          {history.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">
                Action History ({history.length})
              </p>
              <ActionHistoryList
                actions={history}
                onFeedback={handleFeedback}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
