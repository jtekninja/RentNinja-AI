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
    <div className="mt-3 rounded-[18px] border border-amber-300 bg-amber-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d97706]">
        Override Recommendation
      </p>
      <p className="mt-2 text-sm font-medium text-[#334155]">
        Override: <span className="font-semibold text-[#071126]">{title}</span>
      </p>
      <p className="mt-1 text-xs font-medium text-[#475569]">
        System confidence: {confidence}%
      </p>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-bold text-[#071126]">
          Reason for override (optional):
        </label>
        <textarea
          className="w-full resize-none rounded-xl border border-[#94a3b8] bg-white px-3 py-2 text-sm font-medium text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f]"
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
          className="rounded-full border border-[#94a3b8] bg-white px-4 py-1.5 text-xs font-bold text-[#334155] transition-colors hover:border-[#ff4b1f] hover:bg-[#f8fafc] hover:text-[#ff4b1f] disabled:opacity-80"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={pending}
          className="rounded-full border border-amber-300 bg-white px-4 py-1.5 text-xs font-bold text-[#d97706] transition-colors hover:bg-amber-100 disabled:opacity-80"
        >
          {pending ? "Saving..." : "Confirm override"}
        </button>
      </div>
    </div>
  );
}
