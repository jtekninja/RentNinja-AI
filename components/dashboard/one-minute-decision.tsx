"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────
type DecisionResult = {
  applicantName: string;
  phone: string;
  email: string;
  moveInDate: string;
  monthlyRent: string;
  householdIncome: string;
  employmentInfo: string;
  voucherInfo: string;
  tenantPortion: string;
  occupants: string;
  petsSmoking: string;
  documentsMentioned: string[];
  missingDocuments: string[];
  redFlagsOrConcerns: string[];
  followUpQuestions: string[];
  suggestedStatus: string;
  ninjaDecisionScore: number;
  readiness: number;
  riskLevel: "Low" | "Medium" | "High";
  confidenceLevel: "Low" | "Medium" | "High";
  confidenceReason: string;
  mainStrength: string;
  mainConcern: string;
  bestNextStep: string;
  suggestedMessage: string;
  demoMode: boolean;
};

const exampleText =
  "Applicant name is Nina Patel. Phone 555-0184, email nina@example.com. Rent is $2450. Household income is $9200. Move-in June 15. Documents received: ID, proof of income, bank statements. Needs landlord reference.";

// ── localStorage helpers ─────────────────────────────────────────────────────
const STORAGE_KEY = "rentninja:reviewed-applicants";

type SavedReview = {
  id: string;
  applicantId?: string;
  savedAt: string;
  rawInput: string;
  result: DecisionResult;
};

function loadReviews(): SavedReview[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveReview(review: SavedReview) {
  if (typeof window === "undefined") return;
  const reviews = loadReviews();
  const idx = reviews.findIndex((r) => r.id === review.id);
  if (idx >= 0) reviews[idx] = review;
  else reviews.push(review);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

function parseMoney(value: string) {
  const parsed = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSupport(value: string): "None" | "Voucher" | "Subsidy" {
  const text = value.toLowerCase();
  if (text.includes("voucher")) return "Voucher";
  if (text.includes("subsidy") || text.includes("section 8")) return "Subsidy";
  return "None";
}

function normalizeStatus(value: string) {
  const allowed = new Set([
    "New",
    "Pre-screening",
    "Missing Documents",
    "Ready for Review",
    "Tour Scheduled",
    "Owner Review",
    "Strong Candidate",
    "Manual Review",
    "Approved",
    "Declined",
    "Leased",
    "Archived",
    "Screening",
    "Review",
    "Rejected",
  ]);
  return allowed.has(value) ? value : "New";
}

function fallbackName() {
  return `Unnamed Applicant - ${new Date().toLocaleString()}`;
}

function usableText(value: string) {
  const trimmed = value?.trim() ?? "";
  return /^(not found|not provided|unknown|n\/a)$/i.test(trimmed) ? "" : trimmed;
}

function buildApplicantPayload(result: DecisionResult, rawInput: string) {
  const uniqueSuffix = Date.now();
  const name = usableText(result.applicantName) || fallbackName();
  const email = usableText(result.email) || `unnamed-${uniqueSuffix}@rentninja.local`;
  const phone = usableText(result.phone) || `000${String(uniqueSuffix).slice(-7)}`;
  const monthlyRent = parseMoney(result.monthlyRent);
  const monthlyIncome = parseMoney(result.householdIncome);
  const housingSupport = normalizeSupport(result.voucherInfo);
  const tenantPortionRent = parseMoney(result.tenantPortion);
  const baseScore = Math.max(0, Math.min(100, result.ninjaDecisionScore || 70));
  const documentationScore = Math.max(0, Math.min(100, result.readiness || baseScore));
  const notes = [
    "1-Minute Applicant Review",
    `Raw pasted applicant text\n${rawInput}`,
    `Extracted field summary\nName: ${name}\nPhone: ${result.phone || "Not provided"}\nEmail: ${result.email || "Not provided"}\nMove-in: ${result.moveInDate || "Not provided"}\nRent: ${result.monthlyRent || "Not provided"}\nIncome: ${result.householdIncome || "Not provided"}\nVoucher/subsidy: ${result.voucherInfo || "None"}\nTenant portion: ${result.tenantPortion || "Not provided"}\nEmployment/income notes: ${result.employmentInfo || "Not provided"}\nOccupants: ${result.occupants || "Not provided"}\nPets/smoking: ${result.petsSmoking || "Not provided"}`,
    `Ninja Decision Score\nScore: ${result.ninjaDecisionScore}/100\nReadiness: ${result.readiness}%\nRisk level: ${result.riskLevel}\nConfidence: ${result.confidenceLevel}\nConfidence reason: ${result.confidenceReason}`,
    `Strengths\n${result.mainStrength || "None identified"}`,
    `Concerns\n${[result.mainConcern, ...result.redFlagsOrConcerns].filter(Boolean).join("\n") || "None identified"}`,
    `Missing items\n${result.missingDocuments.join("\n") || "No missing documents detected."}`,
    `Follow-up questions\n${result.followUpQuestions.join("\n") || "No follow-up questions generated."}`,
    `Next step\n${result.bestNextStep || result.suggestedStatus || "Review applicant"}`,
    `Suggested message\n${result.suggestedMessage || "No suggested message generated."}`,
    email.endsWith("@rentninja.local")
      ? "System note\nApplicant email was not provided in the pasted text. RentNinja used a placeholder so the record could be saved."
      : "",
    phone.startsWith("000")
      ? "System note\nApplicant phone was not provided in the pasted text. RentNinja used a placeholder so the record could be saved."
      : "",
  ].filter(Boolean);

  return {
    name,
    email,
    phone,
    propertyAddress: "",
    propertyCity: "",
    propertyState: "",
    propertyPostalCode: "",
    moveInDate: result.moveInDate || "",
    coApplicants: [],
    monthlyRent,
    monthlyIncome,
    housingSupport,
    supportProgram: housingSupport === "None" ? "" : result.voucherInfo,
    monthlySubsidyAmount: 0,
    tenantPortionRent,
    subsidyStatus: housingSupport === "None" ? "N/A" : "Pending",
    inspectionStatus: "N/A",
    creditScore: 0,
    residentScore: 0,
    rentalHistoryScore: baseScore,
    rulesComplianceScore: baseScore,
    timelineScore: baseScore,
    communicationScore: baseScore,
    documentationScore,
    applicationSource: "Email / Manual",
    notes,
    status: normalizeStatus(result.suggestedStatus),
  };
}

// ── Component ────────────────────────────────────────────────────────────────
export function OneMinuteDecision() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedApplicantId, setSavedApplicantId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Run AI review ──
  async function runDecision() {
    setPending(true);
    setError("");
    setSavedId(null);
    setSavedApplicantId(null);

    try {
      const response = await fetch("/api/ai/one-minute-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to run applicant decision.");
        return;
      }

      setResult(data);
    } finally {
      setPending(false);
    }
  }

  // ── Save applicant to localStorage ──
  async function saveApplicant() {
    if (!result) {
      setError("Generate a review before saving.");
      return null;
    }

    if (savedId && savedApplicantId) {
      return { reviewId: savedId, applicantId: savedApplicantId };
    }

    setError("");

    try {
      const response = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildApplicantPayload(result, input)),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Applicant save failed.");
      }

      const review: SavedReview = {
        id: crypto.randomUUID?.() ?? `review-${Date.now()}`,
        applicantId: data._id,
        savedAt: new Date().toISOString(),
        rawInput: input,
        result,
      };

      saveReview(review);
      setSavedId(review.id);
      setSavedApplicantId(data._id);
      router.refresh();
      return { reviewId: review.id, applicantId: data._id };
    } catch (err) {
      console.error("Unable to save 1-Minute Applicant Review applicant:", err);
      setError("Unable to save applicant. Please try again.");
      return null;
    }
  }

  // ── Clear / Reset ──
  function clearAll() {
    setInput("");
    setResult(null);
    setError("");
    setSavedId(null);
    setSavedApplicantId(null);
    setCopied(false);
  }

  // ── Copy message ──
  async function copyMessage() {
    if (result?.suggestedMessage) {
      await navigator.clipboard?.writeText(result.suggestedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── Create owner report (save first, then navigate) ──
  async function createOwnerReport() {
    if (!result) return;

    // Auto-save if not already saved
    let id = savedId;
    let applicantId = savedApplicantId;
    if (!id || !applicantId) {
      const saved = await saveApplicant();
      if (!saved) return;
      id = saved.reviewId;
      applicantId = saved.applicantId;
    }

    router.push(`/dashboard/reports?applicantId=${applicantId}&reviewId=${id}`);
  }

  return (
    <section id="one-minute" className="dashboard-card p-5">
      <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
        {/* ── Left panel: input ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
            1-Minute Applicant Review
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#071126]">
            Paste messy info. Get the next step.
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
            Paste a Zillow reply, text conversation, email, or application
            notes. RentNinja organizes the details, scores readiness, and drafts
            the follow-up.
          </p>
          <textarea
            className="mt-4 min-h-56 w-full rounded-[18px] border border-[#94a3b8] bg-white px-4 py-3 text-base font-semibold leading-7 text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f] focus:shadow-[0_0_0_3px_rgba(255,75,31,0.22)]"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste applicant message, screening answers, voucher notes, or document text..."
          />
          <label className="mt-3 flex min-h-[54px] cursor-pointer items-center justify-between gap-3 rounded-[16px] border border-dashed border-[#ff9c7f] bg-[#fff0ea] px-4 py-3 text-sm font-black text-[#071126]">
            <span>Upload file/screenshot placeholder</span>
            <input
              type="file"
              className="max-w-[150px] text-xs font-bold text-[#334155] file:mr-3 file:rounded-full file:border-0 file:bg-[#ff4b1f] file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
              onChange={() =>
                setInput((current) =>
                  current
                    ? `${current}\n\n[Uploaded packet attached for extraction placeholder]`
                    : "[Uploaded packet attached for extraction placeholder]",
                )
              }
            />
          </label>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={pending || !input.trim()}
              onClick={runDecision}
            >
              {pending ? "Reviewing..." : "Run 1-Minute Review"}
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setInput(exampleText)}
            >
              Use sample
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={clearAll}
            >
              Clear
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-[#dc2626]">
              <p>RentNinja needs your attention.</p>
              <p className="mt-1 font-semibold">{error}</p>
            </div>
          ) : null}
          {savedId ? (
            <p className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-[#059669]">
              Applicant saved.
            </p>
          ) : null}
        </div>

        {/* ── Right panel: results ── */}
        <div
          id="extractor"
          className="rounded-[22px] border border-[#b8c4d4] bg-[#f8fafc] p-4"
        >
          {pending ? (
            <div className="flex min-h-[520px] flex-col justify-center rounded-[18px] border border-dashed border-[#b8c4d4] bg-white p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                Organizing applicant info...
              </p>
              <h3 className="mt-3 text-2xl font-black text-[#071126]">
                Checking missing documents and next steps
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#334155]">
                RentNinja is extracting details, scoring readiness, and building
                a simple follow-up message.
              </p>
            </div>
          ) : result ? (
            <div>
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                    Decision card {result.demoMode ? "(demo)" : ""}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[#071126]">
                    {result.applicantName}
                  </h3>
                </div>
                <div className="rounded-full border border-[#ffccb5] bg-[#fff0ea] px-4 py-2 text-sm font-black text-[#071126]">
                  {result.ninjaDecisionScore}/100
                </div>
              </div>

              {/* Metrics */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <DecisionMetric
                  label="Readiness"
                  value={`${result.readiness}%`}
                />
                <DecisionMetric label="Risk" value={result.riskLevel} />
                <DecisionMetric
                  label="Confidence"
                  value={result.confidenceLevel}
                />
              </div>

              {/* Confidence reason */}
              <p className="mt-3 rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#334155]">
                {result.confidenceReason}
              </p>

              {/* Insights */}
              <div className="mt-4 grid gap-3">
                <Insight
                  label="Best next step"
                  value={result.bestNextStep}
                  accent
                />
                <Insight label="Main strength" value={result.mainStrength} />
                <Insight label="Main concern" value={result.mainConcern} />
              </div>

              {/* Missing docs & follow-up */}
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <ListBlock
                  title="Missing documents"
                  items={result.missingDocuments}
                  fallback="No missing documents detected."
                />
                <ListBlock
                  title="Follow-up questions"
                  items={result.followUpQuestions}
                  fallback="No follow-up questions generated."
                />
              </div>

              {/* Extracted fields */}
              <div className="mt-4 rounded-2xl border border-[#b8c4d4] bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                  Extracted details
                </p>
                <div className="mt-3 grid gap-2 text-sm font-semibold text-[#334155] sm:grid-cols-2">
                  {[
                    ["Phone", result.phone || "Not found"],
                    ["Email", result.email || "Not found"],
                    ["Move-in", result.moveInDate || "Not found"],
                    ["Rent", result.monthlyRent],
                    ["Income", result.householdIncome],
                    ["Voucher/subsidy", result.voucherInfo],
                    ["Tenant portion", result.tenantPortion],
                    ["Status", result.suggestedStatus],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-[#f8fafc] px-3 py-2"
                    >
                      <span className="font-black text-[#071126]">
                        {label}:{" "}
                      </span>
                      {value}
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested message */}
              <div className="mt-4 rounded-2xl border border-[#ffccb5] bg-[#fff0ea] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                  Suggested message
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
                  {result.suggestedMessage}
                </p>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={saveApplicant}
                >
                  {savedId ? "Saved" : "Save Applicant"}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={copyMessage}
                >
                  {copied ? "Copied" : "Copy Message"}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={createOwnerReport}
                >
                  Create Owner Report
                </button>
                <Link
                  className="btn-secondary text-sm"
                  href="/dashboard/compare"
                >
                  Compare
                </Link>
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  onClick={clearAll}
                >
                  Clear / Reset
                </button>
              </div>

              {/* Time saved */}
              <p className="mt-4 rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3 text-sm font-black text-[#071126]">
                Applicant packet organized. Estimated time saved: 20 minutes.
              </p>

              {/* Compliance */}
              <p className="mt-4 text-xs font-bold leading-5 text-[#475569]">
                Fair Housing Mode: On. RentNinja uses objective screening
                criteria only. Final decisions are your responsibility.
              </p>
            </div>
          ) : (
            <div className="flex min-h-[520px] flex-col justify-center rounded-[18px] border border-dashed border-[#b8c4d4] bg-white p-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                Messy Info Extractor
              </p>
              <h3 className="mt-3 text-2xl font-black text-[#071126]">
                Your clean decision card appears here
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#334155]">
                Paste a message or applicant packet to extract contact details,
                rent, income, missing documents, concerns, follow-up questions,
                and a suggested status.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Sub components ────────────────────────────────────────────────────────────
function DecisionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-[#071126]">{value}</p>
    </div>
  );
}

function Insight({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${accent ? "border-[#ffccb5] bg-[#fff0ea]" : "border-[#b8c4d4] bg-white"}`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold leading-6 text-[#071126]">{value}</p>
    </div>
  );
}

function ListBlock({
  title,
  items,
  fallback,
}: {
  title: string;
  items: string[];
  fallback: string;
}) {
  return (
    <div className="rounded-2xl border border-[#b8c4d4] bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
        {title}
      </p>
      <ul className="mt-3 grid gap-2 text-sm font-semibold text-[#334155]">
        {(items.length ? items : [fallback]).map((item) => (
          <li key={item} className="rounded-xl bg-[#f8fafc] px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
