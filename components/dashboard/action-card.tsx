"use client";

import { useState } from "react";
import { ConfidenceBadge } from "@/components/dashboard/confidence-badge";
import { FactTrail } from "@/components/dashboard/fact-trail";
import { OverrideDialog } from "@/components/dashboard/override-dialog";

interface ActionCardProps {
  action: {
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
  };
  onAccept: () => Promise<void>;
  onSkip: () => Promise<void>;
  onOverride: (reason: string, actionTaken: string) => Promise<void>;
  pending?: boolean;
}

export function ActionCard({
  action,
  onAccept,
  onSkip,
  onOverride,
  pending = false,
}: ActionCardProps) {
  const [showFacts, setShowFacts] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const priorityColors: Record<string, string> = {
    P0: "border-rose-300/20 bg-rose-300/8",
    P1: "border-amber-300/15 bg-amber-300/6",
    P2: "border-white/8 bg-black/15",
    info: "border-white/8 bg-black/15",
  };

  const priorityLabels: Record<string, string> = {
    P0: "URGENT",
    P1: "HIGH",
    P2: "NORMAL",
    info: "INFO",
  };

  const priorityLabelColors: Record<string, string> = {
    P0: "text-rose-300",
    P1: "text-amber-300",
    P2: "text-slate-400",
    info: "text-slate-500",
  };

  return (
    <div
      className={`rounded-[22px] border px-4 py-3 ${priorityColors[action.priority]} ${pending ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.2em] ${priorityLabelColors[action.priority]}`}
        >
          {priorityLabels[action.priority]}
        </span>
        <ConfidenceBadge
          confidence={action.confidence}
          showMax
          maxConfidence={action.maxConfidence}
        />
        {action.automationAvailable ? (
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-300">
            Auto
          </span>
        ) : null}
        {action.automationSafe && !action.automationAvailable ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
            Auto-ready
          </span>
        ) : null}
      </div>

      <p className="text-sm font-semibold text-white">{action.title}</p>
      <p className="mt-1 text-sm text-slate-300">{action.description}</p>
      <p className="mt-2 text-sm font-medium text-[#f7b36d]">
        {action.suggestedAction}
      </p>

      <button
        onClick={() => setShowFacts(!showFacts)}
        className="mt-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
      >
        {showFacts ? "Hide facts" : "Show facts"}
      </button>

      {showFacts ? <FactTrail explainability={action.explainability} /> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onAccept}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20 transition-colors disabled:opacity-50"
        >
          <span>✓</span> Accept
        </button>
        <button
          onClick={onSkip}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <span>↩</span> Skip
        </button>
        <button
          onClick={() => setOverrideOpen(true)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-transparent px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/10 transition-colors disabled:opacity-50"
        >
          <span>↻</span> Override
        </button>
      </div>

      {overrideOpen ? (
        <OverrideDialog
          title={action.title}
          confidence={action.confidence}
          onConfirm={async (reason, actionTaken) => {
            await onOverride(reason, actionTaken);
            setOverrideOpen(false);
          }}
          onCancel={() => setOverrideOpen(false)}
        />
      ) : null}
    </div>
  );
}
