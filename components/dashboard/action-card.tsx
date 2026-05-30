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
    P0: "border-rose-300 bg-rose-50",
    P1: "border-amber-300 bg-amber-50",
    P2: "border-[#b8c4d4] bg-white",
    info: "border-[#b8c4d4] bg-white",
  };

  const priorityLabels: Record<string, string> = {
    P0: "URGENT",
    P1: "HIGH",
    P2: "NORMAL",
    info: "INFO",
  };

  const priorityLabelColors: Record<string, string> = {
    P0: "text-rose-700",
    P1: "text-amber-700",
    P2: "text-[#334155]",
    info: "text-[#475569]",
  };

  return (
    <div
      className={`rounded-[22px] border px-4 py-3 ${priorityColors[action.priority]} ${pending ? "pointer-events-none opacity-80" : ""}`}
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
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-700">
            Auto
          </span>
        ) : null}
        {action.automationSafe && !action.automationAvailable ? (
          <span className="rounded-full border border-[#94a3b8] bg-[#f8fafc] px-2 py-0.5 text-[10px] font-bold text-[#475569]">
            Auto-ready
          </span>
        ) : null}
      </div>

      <p className="text-sm font-bold text-[#071126]">{action.title}</p>
      <p className="mt-1 text-sm font-medium leading-6 text-[#334155]">
        {action.description}
      </p>
      <p className="mt-2 text-sm font-bold text-[#e83d14]">
        {action.suggestedAction}
      </p>

      <button
        onClick={() => setShowFacts(!showFacts)}
        className="mt-2 text-xs font-bold text-[#475569] transition-colors hover:text-[#ff4b1f]"
      >
        {showFacts ? "Hide facts" : "Show facts"}
      </button>

      {showFacts ? <FactTrail explainability={action.explainability} /> : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={onAccept}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#059669] transition-colors hover:bg-emerald-100 disabled:opacity-80"
        >
          <span>✓</span> Accept
        </button>
        <button
          onClick={onSkip}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#94a3b8] bg-white px-3 py-1.5 text-xs font-bold text-[#334155] transition-colors hover:border-[#ff4b1f] hover:bg-[#f8fafc] hover:text-[#ff4b1f] disabled:opacity-80"
        >
          <span>↩</span> Skip
        </button>
        <button
          onClick={() => setOverrideOpen(true)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-[#d97706] transition-colors hover:bg-amber-50 disabled:opacity-80"
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
