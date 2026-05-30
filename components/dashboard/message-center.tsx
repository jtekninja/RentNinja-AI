"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const templates = [
  "Request missing documents",
  "Ask screening questions",
  "Invite to showing",
  "Follow up after showing",
  "Ask voucher/case worker for clarification",
  "Send applicant summary to owner",
  "Request owner decision",
  "Approved next steps",
  "Polite decline",
  "Waitlist",
];

const tones = [
  "Professional",
  "Warm",
  "Direct",
  "Friendly",
  "Realtor-style",
  "Property manager-style",
];

const emailSubjects: Record<string, string> = {
  "Request missing documents": "Missing Documents Request",
  "Ask screening questions": "Apartment Application Follow-Up",
  "Invite to showing": "Showing Invitation",
  "Follow up after showing": "Showing Follow-Up",
  "Ask voucher/case worker for clarification": "Apartment Application Follow-Up",
  "Send applicant summary to owner": "Applicant Summary",
  "Request owner decision": "Owner Decision Request",
  "Approved next steps": "Application Approved Next Steps",
  "Polite decline": "Apartment Application Update",
  Waitlist: "Apartment Application Waitlist Update",
};

function getEmailSubject(template: string, mode: "generate" | "polish") {
  if (mode === "polish") return "Apartment Application Follow-Up";
  return emailSubjects[template] ?? "Apartment Application Follow-Up";
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function extractPhone(text: string) {
  const candidate = text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0] ?? "";
  return candidate.replace(/[^\d+]/g, "");
}

export function MessageCenter() {
  const [mode, setMode] = useState<"generate" | "polish">("generate");
  const [template, setTemplate] = useState(templates[0]);
  const [tone, setTone] = useState("Professional");
  const [context, setContext] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [actionFeedback, setActionFeedback] = useState("");
  const [savedApplicants, setSavedApplicants] = useState<
    Array<{
      _id: string;
      name: string;
      email: string;
      phone: string;
      status: string;
      monthlyRent: number;
      monthlyIncome: number;
      notes: string[];
    }>
  >([]);
  const hasMessage = message.trim().length > 0;
  const applicantEmail = extractEmail(context);
  const applicantPhone = extractPhone(context);
  const emailSubject = getEmailSubject(template, mode);
  const emailHref = `mailto:${applicantEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(message)}`;
  const smsHref = `sms:${applicantPhone}?&body=${encodeURIComponent(message)}`;

  useEffect(() => {
    let active = true;
    async function loadApplicants() {
      try {
        const response = await fetch("/api/applicants");
        const data = await response.json();
        if (active && response.ok && Array.isArray(data)) {
          setSavedApplicants(data);
        }
      } catch (err) {
        console.error("Unable to load saved applicants for messages:", err);
      }
    }

    loadApplicants();
    return () => {
      active = false;
    };
  }, []);

  function applySavedApplicant(applicantId: string) {
    const applicant = savedApplicants.find((item) => item._id === applicantId);
    if (!applicant) return;
    setContext(
      [
        `Applicant: ${applicant.name}`,
        `Email: ${applicant.email}`,
        `Phone: ${applicant.phone}`,
        `Status: ${applicant.status}`,
        `Rent: $${applicant.monthlyRent}`,
        `Income: $${applicant.monthlyIncome}`,
        applicant.notes.length ? `Notes:\n${applicant.notes.join("\n\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    setMessage("");
    setCopied(false);
    setActionFeedback("");
  }

  async function generate() {
    setPending(true);
    setCopied(false);
    setError("");
    setActionFeedback("");

    try {
      const response = await fetch("/api/ai/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: mode === "polish" ? "Polish rough message" : template,
          recipient: "applicant",
          context: `${context}\nTone: ${tone}\nMode: ${mode}`,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "RentNinja could not generate this right now. Try again or use the text box manually.",
        );
        return;
      }

      setMessage(data.message || "Unable to generate message.");
    } catch {
      setError(
        "RentNinja could not generate this right now. Try again or use the text box manually.",
      );
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!hasMessage) {
      setActionFeedback("Generate a message first.");
      return;
    }
    await navigator.clipboard?.writeText(message);
    setCopied(true);
    setActionFeedback("Message copied.");
  }

  function openEmail() {
    if (!hasMessage) {
      setActionFeedback("Generate a message first.");
      return;
    }
    window.location.href = emailHref;
  }

  function openSms() {
    if (!hasMessage) {
      setActionFeedback("Generate a message first.");
      return;
    }
    window.location.href = smsHref;
  }

  function saveToTimeline() {
    if (!hasMessage) {
      setActionFeedback("Generate a message first.");
      return;
    }
    setActionFeedback("Message ready to save when timeline persistence is connected.");
  }

  function clearAll() {
    setMode("generate");
    setTemplate(templates[0]);
    setTone("Professional");
    setContext("");
    setMessage("");
    setCopied(false);
    setError("");
    setActionFeedback("");
  }

  return (
    <section className="grid gap-4 md:grid-cols-[0.9fr,1.1fr]">
      <div className="dashboard-card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
          One-Click Follow-Up
        </p>
        <h2 className="mt-2 text-xl font-black text-[#050b1f]">
          Generate or polish a message
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
          Turn rough notes into a professional applicant, owner, or case worker
          message.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] p-1">
          {[
            ["generate", "Generate"],
            ["polish", "Polish"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value as "generate" | "polish")}
              className={`min-h-[44px] rounded-xl text-sm font-black ${
                mode === value
                  ? "bg-[#ff4b1f] text-white shadow-[0_8px_18px_rgba(255,75,31,0.2)]"
                  : "text-[#071126] hover:bg-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3">
          {mode === "generate" ? (
            <label className="grid gap-2 text-sm font-bold text-[#071126]">
              Message type
              <select
                className="dashboard-input"
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
              >
                {templates.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          ) : null}

          {savedApplicants.length > 0 ? (
            <label className="grid gap-2 text-sm font-bold text-[#071126]">
              Saved applicant
              <select
                className="dashboard-input"
                defaultValue=""
                onChange={(event) => applySavedApplicant(event.target.value)}
              >
                <option value="" disabled>
                  Choose a saved applicant...
                </option>
                {savedApplicants.map((applicant) => (
                  <option key={applicant._id} value={applicant._id}>
                    {applicant.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-bold text-[#071126]">
            Tone
            <select
              className="dashboard-input"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
            >
              {tones.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-[#071126]">
            {mode === "polish" ? "Rough message" : "Applicant context"}
            <textarea
              className="min-h-32 rounded-[16px] border border-[#94a3b8] bg-white px-4 py-3 text-base font-semibold text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f] focus:shadow-[0_0_0_3px_rgba(255,75,31,0.22)]"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder={
                mode === "polish"
                  ? "Paste your rough message here. RentNinja will make it clear, professional, and objective."
                  : "Paste missing docs, applicant status, owner question, or showing context."
              }
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-[#dc2626]">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={generate} disabled={pending}>
              {pending
                ? "Building follow-up message..."
                : mode === "polish"
                  ? "Polish Message"
                  : "Generate Follow-Up"}
            </Button>
            <Button type="button" variant="secondary" onClick={clearAll}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="dashboard-card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
          Ready to send
        </p>
        <textarea
          className="mt-4 min-h-64 w-full rounded-[18px] border border-[#94a3b8] bg-white px-4 py-3 text-base font-semibold text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f] focus:shadow-[0_0_0_3px_rgba(255,75,31,0.22)]"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Generated or polished message appears here."
        />
        {message ? (
          <p className="mt-3 rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3 text-sm font-black text-[#071126]">
            Follow-up message generated. Estimated time saved: 5 minutes.
          </p>
        ) : (
          <p className="mt-3 rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-4 py-3 text-sm font-black text-[#475569]">
            Generate a message first.
          </p>
        )}
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#475569]">
          Fair Housing Mode: On. RentNinja uses objective screening criteria
          only. Final decisions are your responsibility.
        </p>
        {actionFeedback ? (
          <p className="mt-3 rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-4 py-3 text-sm font-bold text-[#334155]">
            {actionFeedback}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={copy} disabled={!hasMessage}>
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={saveToTimeline}
            disabled={!hasMessage}
          >
            Save to timeline
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={openSms}
            disabled={!hasMessage}
          >
            Open SMS
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={openEmail}
            disabled={!hasMessage}
          >
            Open email
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={generate}
            disabled={pending || !context.trim()}
          >
            Regenerate
          </Button>
          <Button type="button" variant="ghost" onClick={clearAll}>
            Clear
          </Button>
        </div>
      </div>
    </section>
  );
}
