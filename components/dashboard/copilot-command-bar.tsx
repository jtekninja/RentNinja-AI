"use client";

import { useState } from "react";

const quickPrompts = [
  "Who is my strongest applicant?",
  "What should I do next?",
  "Which applicants are missing documents?",
  "Generate a follow-up message",
  "Prepare owner report",
  "Compare top 3 applicants",
];

type CopilotResult = {
  answer: string;
  actions?: string[];
  fairHousingReminder?: string;
  demoMode?: boolean;
};

export function CopilotCommandBar() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<CopilotResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function askCopilot(nextPrompt = prompt) {
    const trimmed = nextPrompt.trim();
    if (!trimmed) return;

    setPrompt(trimmed);
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to ask Leasing Copilot.");
        return;
      }

      setResult(data);
    } finally {
      setPending(false);
    }
  }

  async function copyAnswer() {
    if (result?.answer) {
      await navigator.clipboard?.writeText(result.answer);
    }
  }

  return (
    <section className="dashboard-card p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
            Leasing Copilot
          </p>
          <h2 className="mt-2 text-xl font-black text-[#050b1f]">
            Ask what to do next
          </h2>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            className="dashboard-input min-h-[52px] flex-1"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                askCopilot();
              }
            }}
            placeholder="Ask RentNinja: compare applicants, write follow-up, find missing docs..."
          />
          <button
            type="button"
            className="min-h-[52px] rounded-full bg-[#ff4b1f] px-6 text-sm font-black text-white shadow-[0_10px_22px_rgba(255,75,31,0.22)] hover:bg-[#e63e16] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={pending || !prompt.trim()}
            onClick={() => askCopilot()}
          >
            {pending ? "Thinking..." : "Ask"}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quickPrompts.map((item) => (
            <button
              key={item}
              type="button"
              className="shrink-0 rounded-full border border-[#b8c4d4] bg-white px-4 py-2 text-xs font-bold text-[#071126] hover:border-[#ff4b1f] hover:bg-[#fff0ea] hover:text-[#ff4b1f]"
              onClick={() => askCopilot(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {error ? (
          <p className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-[#dc2626]">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="rounded-[20px] border border-[#b8c4d4] bg-[#f8fafc] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
                  {result.demoMode ? "Demo answer" : "AI answer"}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
                  {result.answer}
                </p>
              </div>
              <button
                type="button"
                className="min-h-[44px] rounded-full border border-[#94a3b8] bg-white px-5 py-2 text-sm font-bold text-[#071126] hover:border-[#ff4b1f] hover:bg-[#fff0ea]"
                onClick={copyAnswer}
              >
                Copy
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(result.actions || ["Save", "Generate message", "Create report"]).map(
                (action) => (
                  <span
                    key={action}
                    className="rounded-full border border-[#b8c4d4] bg-white px-3 py-1 text-xs font-bold text-[#334155]"
                  >
                    {action}
                  </span>
                ),
              )}
            </div>
            <p className="mt-3 text-xs font-bold text-[#475569]">
              {result.fairHousingReminder ||
                "RentNinja uses objective screening criteria only. Final decisions are your responsibility."}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
