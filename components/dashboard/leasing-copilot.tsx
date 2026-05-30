"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const quickPrompts = [
  "Compare my top applicants",
  "Summarize this applicant",
  "What is missing?",
  "Generate follow-up message",
  "Prepare owner report",
  "Create screening checklist",
];

export function LeasingCopilot() {
  const [prompt, setPrompt] = useState("What should I do next?");
  const [answer, setAnswer] = useState("");
  const [actions, setActions] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  async function askCopilot(nextPrompt = prompt) {
    setPending(true);
    setPrompt(nextPrompt);

    try {
      const response = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: nextPrompt }),
      });
      const data = await response.json();
      setAnswer(data.answer || data.message || "Copilot could not answer yet.");
      setActions(data.actions || []);
      setDemoMode(Boolean(data.demoMode));
    } finally {
      setPending(false);
    }
  }

  async function copyAnswer() {
    await navigator.clipboard?.writeText(answer);
  }

  return (
    <section className="dashboard-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
            Leasing Copilot
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#050b1f]">
            Ask what to do next
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#334155]">
            Compare applicants, find missing docs, write follow-ups, and prepare owner summaries using objective criteria.
          </p>
        </div>
        {demoMode ? (
          <span className="rounded-full border border-[#ffb89f] bg-[#fff0ea] px-4 py-2 text-sm font-black text-[#d63a12]">
            Demo AI mode
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickPrompts.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => askCopilot(item)}
            className="min-h-[42px] rounded-full border border-[#94a3b8] bg-white px-4 py-2 text-sm font-bold text-[#071126] hover:border-[#ff4b1f] hover:bg-[#fff0ea] hover:text-[#ff4b1f]"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          className="dashboard-input min-h-[48px]"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask RentNinja: compare applicants, write follow-up, find missing docs..."
        />
        <Button type="button" onClick={() => askCopilot()} disabled={pending}>
          {pending ? "Thinking..." : "Ask Copilot"}
        </Button>
      </div>

      {answer ? (
        <div className="mt-4 rounded-[18px] border border-[#b8c4d4] bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold leading-7 text-[#071126]">{answer}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#475569]">
            RentNinja uses objective screening criteria only. Final decisions are your responsibility.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={copyAnswer}>Copy</Button>
            {actions.map((action) => (
              <Button key={action} type="button" variant="secondary">
                {action}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
