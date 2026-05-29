"use client";

import { useState } from "react";

interface OverrideDialogProps {
  title: string;
  confidence: number;
  onConfirm: (reason: string, actionTaken: string) => Promise<void>;
  onCancel: () => void;
}

export function OverrideDialog({
  title,
  confidence,
  onConfirm,
  onCancel,
}: OverrideDialogProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm(reason, "Manual override");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-3 rounded-[22px] border border-amber-400/20 bg-amber-400/5 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80 font-semibold">
        Override Recommendation
      </p>
      <p className="mt-2 text-sm text-slate-200">
        Override: <span className="text-white font-medium">{title}</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">
        System confidence: {confidence}%
      </p>

      <div className="mt-3">
        <label className="text-xs text-slate-400 block mb-1">
          Reason for override (optional):
        </label>
        <textarea
          className="dark-field w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-[#f7b36d]/60 resize-none"
          placeholder="Why are you overriding this recommendation?"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onCancel}
          disabled={pending}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={pending}
          className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 transition-colors disabled:opacity-50"
        >
          {pending ? "Saving..." : "Confirm override"}
        </button>
      </div>
    </div>
  );
}
