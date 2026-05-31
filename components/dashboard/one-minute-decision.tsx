"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  calculateIncomeToRentRatio,
  detectIncomeFrequency,
  formatAffordabilityDisplay,
  formatIncomeDisplay,
  formatRentDisplay,
  normalizeIncomeToMonthly,
  parseMoneyAmount,
  parseRentToMonthly,
  type IncomeFrequency,
  type NormalizedIncome,
} from "@/lib/income";

type DecisionResult = {
  applicantName: string;
  phone: string;
  email: string;
  moveInDate: string;
  monthlyRent: string;
  monthlyRentAmount: number;
  householdIncome: string;
  householdIncomeDisplay: string;
  incomeAmount: number;
  incomeFrequency: IncomeFrequency;
  incomeHoursPerWeek?: number;
  normalizedMonthlyIncome: number | null;
  affordabilityDisplay: string;
  incomeWarning?: string | null;
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

const STORAGE_KEY = "rentninja:reviewed-applicants";
const exampleText =
  "Applicant name is Nina Patel. Phone 555-0184, email nina@example.com. Rent is $2450/month. Household income is $9200/month. Move-in June 15. Documents received: ID, proof of income, bank statements. Needs landlord reference.";

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
  const index = reviews.findIndex((item) => item.id === review.id);
  if (index >= 0) reviews[index] = review;
  else reviews.push(review);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}

function finiteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function boundedNumber(value: unknown, fallback: number, min = 0, max = 100) {
  const numeric = finiteNumber(value);
  if (numeric === null) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function truncateForField(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function normalizeDecisionResult(data: Partial<DecisionResult>): DecisionResult {
  const incomeAmount =
    finiteNumber(data.incomeAmount) ??
    parseMoneyAmount(data.householdIncomeDisplay) ??
    parseMoneyAmount(data.householdIncome) ??
    0;
  const incomeFrequency =
    data.incomeFrequency && data.incomeFrequency !== "unknown"
      ? data.incomeFrequency
      : detectIncomeFrequency(data.householdIncomeDisplay || data.householdIncome);
  const normalizedMonthlyIncome =
    finiteNumber(data.normalizedMonthlyIncome) ??
    normalizeIncomeToMonthly({
      amount: incomeAmount,
      frequency: incomeFrequency,
      hoursPerWeek: finiteNumber(data.incomeHoursPerWeek),
    });
  const monthlyRentAmount =
    finiteNumber(data.monthlyRentAmount) ??
    parseRentToMonthly(data.monthlyRent) ??
    0;
  const incomeData: NormalizedIncome = {
    amount: incomeAmount > 0 ? incomeAmount : null,
    frequency: incomeFrequency,
    hoursPerWeek: finiteNumber(data.incomeHoursPerWeek) ?? undefined,
    rawText: data.householdIncome ?? "",
    normalizedMonthly: normalizedMonthlyIncome,
  };

  return {
    applicantName: data.applicantName || "Applicant from pasted info",
    phone: data.phone || "",
    email: data.email || "",
    moveInDate: data.moveInDate || "",
    monthlyRent: formatRentDisplay(monthlyRentAmount || null),
    monthlyRentAmount,
    householdIncome: data.householdIncome || "Not found",
    householdIncomeDisplay:
      incomeAmount > 0
        ? formatIncomeDisplay(incomeData)
        : data.householdIncomeDisplay || data.householdIncome || "Not found",
    incomeAmount,
    incomeFrequency,
    incomeHoursPerWeek: finiteNumber(data.incomeHoursPerWeek) ?? undefined,
    normalizedMonthlyIncome,
    affordabilityDisplay: formatAffordabilityDisplay(
      normalizedMonthlyIncome,
      monthlyRentAmount || null,
    ),
    incomeWarning: data.incomeWarning ?? null,
    employmentInfo: data.employmentInfo || "Not found",
    voucherInfo: data.voucherInfo || "No voucher/subsidy mentioned",
    tenantPortion: data.tenantPortion || "Not found",
    occupants: data.occupants || "Not found",
    petsSmoking: data.petsSmoking || "Not found",
    documentsMentioned: data.documentsMentioned ?? [],
    missingDocuments: data.missingDocuments ?? [],
    redFlagsOrConcerns: data.redFlagsOrConcerns ?? [],
    followUpQuestions: data.followUpQuestions ?? [],
    suggestedStatus: data.suggestedStatus || "New",
    ninjaDecisionScore: boundedNumber(data.ninjaDecisionScore, 0),
    readiness: boundedNumber(data.readiness, 0),
    riskLevel: data.riskLevel || "Medium",
    confidenceLevel: data.confidenceLevel || "Medium",
    confidenceReason:
      data.confidenceReason || "Review generated from pasted applicant information.",
    mainStrength: data.mainStrength || "Applicant information was organized.",
    mainConcern: data.mainConcern || "Confirm missing information before deciding.",
    bestNextStep: data.bestNextStep || "Review missing items.",
    suggestedMessage: data.suggestedMessage || "",
    demoMode: Boolean(data.demoMode),
  };
}

export function OneMinuteDecision() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedApplicantId, setSavedApplicantId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  async function runDecision() {
    setPending(true);
    setError("");
    setSaveError("");
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

      setResult(normalizeDecisionResult(data));
    } catch (err) {
      console.error("1-Minute Review failed", err);
      setError("Unable to run applicant decision.");
    } finally {
      setPending(false);
    }
  }

  function recalculateAffordability(
    updates: Partial<
      Pick<
        DecisionResult,
        | "incomeAmount"
        | "incomeFrequency"
        | "incomeHoursPerWeek"
        | "monthlyRentAmount"
      >
    >,
  ) {
    if (!result) return;

    const incomeAmount = updates.incomeAmount ?? result.incomeAmount ?? 0;
    const frequency = updates.incomeFrequency ?? result.incomeFrequency ?? "unknown";
    const hoursPerWeek = updates.incomeHoursPerWeek ?? result.incomeHoursPerWeek;
    const rentAmount = updates.monthlyRentAmount ?? result.monthlyRentAmount ?? 0;
    const normalizedMonthly = normalizeIncomeToMonthly({
      amount: incomeAmount,
      frequency,
      hoursPerWeek,
    });
    const incomeData: NormalizedIncome = {
      amount: incomeAmount > 0 ? incomeAmount : null,
      frequency,
      hoursPerWeek,
      rawText: result.householdIncome,
      normalizedMonthly,
    };

    setResult({
      ...result,
      ...updates,
      incomeAmount,
      incomeFrequency: frequency,
      incomeHoursPerWeek: hoursPerWeek,
      normalizedMonthlyIncome: normalizedMonthly,
      affordabilityDisplay: formatAffordabilityDisplay(
        normalizedMonthly,
        rentAmount > 0 ? rentAmount : null,
      ),
      householdIncomeDisplay:
        incomeAmount > 0 ? formatIncomeDisplay(incomeData) : "Not found",
      monthlyRent: formatRentDisplay(rentAmount > 0 ? rentAmount : null),
      monthlyRentAmount: rentAmount,
      householdIncome: incomeAmount > 0 ? String(incomeAmount) : "Not found",
      incomeWarning:
        frequency === "unknown"
          ? "Income amount found, but frequency is unclear. Confirm yearly/monthly/hourly before relying on affordability score."
          : null,
    });
  }

  function buildApplicantPayload(currentResult: DecisionResult) {
    const monthlyRent =
      parseRentToMonthly(currentResult.monthlyRentAmount || currentResult.monthlyRent) ??
      0;
    const incomeAmount =
      parseMoneyAmount(currentResult.incomeAmount) ??
      parseMoneyAmount(currentResult.householdIncomeDisplay) ??
      parseMoneyAmount(currentResult.householdIncome) ??
      0;
    const incomeFrequency =
      currentResult.incomeFrequency !== "unknown"
        ? currentResult.incomeFrequency
        : detectIncomeFrequency(
            `${currentResult.householdIncomeDisplay} ${currentResult.householdIncome}`,
          );
    const normalizedMonthlyIncome =
      finiteNumber(currentResult.normalizedMonthlyIncome) ??
      normalizeIncomeToMonthly({
        amount: incomeAmount,
        frequency: incomeFrequency,
        hoursPerWeek: finiteNumber(currentResult.incomeHoursPerWeek),
      });
    const incomeToRentRatio = calculateIncomeToRentRatio(
      normalizedMonthlyIncome,
      monthlyRent || null,
    );
    const timestamp = new Date().toLocaleString();
    const applicantName =
      truncateForField(currentResult.applicantName, 150) ||
      `Unnamed Applicant - ${timestamp}`;
    const notes = [
      currentResult.bestNextStep ? `Next step: ${currentResult.bestNextStep}` : "",
      currentResult.mainConcern ? `Main concern: ${currentResult.mainConcern}` : "",
      input ? `Raw pasted text:\n${input}` : "",
    ].filter(Boolean);

    return {
      name: applicantName,
      email:
        currentResult.email && currentResult.email.includes("@")
          ? truncateForField(currentResult.email, 150)
          : `unknown-${Date.now()}@rentninja.local`,
      phone: truncateForField(currentResult.phone || "000-000-0000", 50),
      propertyAddress: "",
      propertyCity: "",
      propertyState: "",
      propertyPostalCode: "",
      moveInDate: truncateForField(currentResult.moveInDate, 150),
      coApplicants: [],
      monthlyRent,
      monthlyIncome: normalizedMonthlyIncome ?? 0,
      incomeAmount: incomeAmount || null,
      incomeFrequency,
      normalizedMonthlyIncome,
      incomeToRentRatio,
      housingSupport:
        /voucher|subsidy|section 8/i.test(currentResult.voucherInfo)
          ? "Voucher"
          : "None",
      supportProgram: truncateForField(currentResult.voucherInfo, 150),
      monthlySubsidyAmount: 0,
      tenantPortionRent: parseMoneyAmount(currentResult.tenantPortion) ?? 0,
      subsidyStatus: "N/A",
      inspectionStatus: "N/A",
      creditScore: 0,
      residentScore: 0,
      rentalHistoryScore: 70,
      rulesComplianceScore: 70,
      timelineScore: currentResult.moveInDate ? 75 : 60,
      communicationScore: 70,
      documentationScore: boundedNumber(currentResult.readiness, 0),
      applicationSource: "Email / Manual",
      rawText: input,
      suggestedMessage: currentResult.suggestedMessage,
      extractedFieldSummary: [
        `Income: ${currentResult.householdIncomeDisplay}`,
        `Rent: ${formatRentDisplay(monthlyRent || null)}`,
        `Ratio: ${formatAffordabilityDisplay(normalizedMonthlyIncome, monthlyRent || null)}`,
        `Status: ${currentResult.suggestedStatus}`,
      ].join("\n"),
      summary: currentResult.confidenceReason,
      concerns: currentResult.redFlagsOrConcerns.length
        ? currentResult.redFlagsOrConcerns
        : [currentResult.mainConcern].filter(Boolean),
      strengths: [currentResult.mainStrength].filter(Boolean),
      missingDocuments: currentResult.missingDocuments,
      nextStep: currentResult.bestNextStep,
      confidenceLevel: currentResult.confidenceLevel,
      confidenceReason: currentResult.confidenceReason,
      readiness: boundedNumber(currentResult.readiness, 0),
      riskLevel: currentResult.riskLevel,
      notes,
      status: currentResult.suggestedStatus || "New",
    };
  }

  async function saveApplicant() {
    if (!result) {
      setSaveError("Generate a review before saving.");
      return null;
    }
    if (saving) return null;

    setSaving(true);
    setSaveError("");
    setSavedId(null);
    setSavedApplicantId(null);

    try {
      const payload = buildApplicantPayload(result);
      const response = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error("Unable to save applicant", {
          status: response.status,
          response: data,
          payload,
        });
        throw new Error(data.message || "Unable to save applicant. Please try again.");
      }

      const applicantId = data?._id || data?.id;
      if (!applicantId) {
        console.error("Applicant save did not return an id", data);
        throw new Error("Unable to save applicant. Please try again.");
      }

      const verifyResponse = await fetch("/api/applicants", { cache: "no-store" });
      const verifyData = await verifyResponse.json().catch(() => []);
      const savedRecord = Array.isArray(verifyData)
        ? verifyData.find((item) => item?._id === applicantId || item?.id === applicantId)
        : null;

      if (!verifyResponse.ok || !savedRecord) {
        console.error("Applicant save verification failed", {
          status: verifyResponse.status,
          response: verifyData,
          applicantId,
        });
        throw new Error("Unable to save applicant. Please try again.");
      }

      const reviewId = crypto.randomUUID?.() ?? `review-${Date.now()}`;
      saveReview({
        id: reviewId,
        applicantId,
        savedAt: new Date().toISOString(),
        rawInput: input,
        result,
      });
      setSavedId(reviewId);
      setSavedApplicantId(applicantId);
      return applicantId as string;
    } catch (err) {
      console.error("Save Applicant failed", err);
      setSaveError(
        err instanceof Error
          ? `Unable to save applicant. Please try again. ${err.message}`
          : "Unable to save applicant. Please try again.",
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  function clearAll() {
    setInput("");
    setResult(null);
    setError("");
    setSaveError("");
    setSavedId(null);
    setSavedApplicantId(null);
    setCopied(false);
    setSelectedFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function copyMessage() {
    if (result?.suggestedMessage) {
      await navigator.clipboard?.writeText(result.suggestedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function createOwnerReport() {
    if (!result) return;
    const applicantId = savedApplicantId ?? (await saveApplicant());
    if (applicantId) {
      router.push(`/dashboard/reports?applicantId=${applicantId}`);
    }
  }

  function handleFileChange(file: File | undefined) {
    if (!file) return;
    setSelectedFileName(file.name);
    setInput((current) =>
      current
        ? `${current}\n\n[Uploaded file selected: ${file.name}]`
        : `[Uploaded file selected: ${file.name}]`,
    );
  }

  return (
    <section id="one-minute" className="dashboard-card p-5">
      <div className="grid gap-5 xl:grid-cols-[0.95fr,1.05fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
            1-Minute Applicant Review
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#071126]">
            Paste messy info. Get the next step.
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
            Paste a Zillow reply, text conversation, email, or application notes.
            RentNinja organizes the details, scores readiness, and drafts the
            follow-up.
          </p>
          <textarea
            className="mt-4 min-h-56 w-full rounded-[18px] border border-[#94a3b8] bg-white px-4 py-3 text-base font-semibold leading-7 text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f] focus:shadow-[0_0_0_3px_rgba(255,75,31,0.22)]"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setSavedId(null);
              setSavedApplicantId(null);
            }}
            placeholder="Paste applicant message, screening answers, voucher notes, or document text..."
          />

          <div className="mt-3 rounded-[18px] border border-dashed border-[#b8c4d4] bg-[#f8fafc] p-4">
            <p className="text-sm font-black text-[#071126]">
              Upload file or screenshot
            </p>
            <p className="mt-1 text-sm font-semibold text-[#475569]">
              Optional - add a screenshot, application notes, or document.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept="image/*,.pdf,.txt,.doc,.docx"
                onChange={(event) => handleFileChange(event.target.files?.[0])}
              />
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </button>
              {selectedFileName ? (
                <span className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-[#b8c4d4] bg-white px-3 py-2 text-xs font-bold text-[#334155]">
                  <span className="truncate">{selectedFileName}</span>
                  <button
                    type="button"
                    className="shrink-0 text-[#dc2626] hover:text-[#991b1b]"
                    onClick={() => {
                      setSelectedFileName("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove
                  </button>
                </span>
              ) : (
                <span className="inline-flex min-h-9 items-center rounded-full border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#64748b]">
                  No file selected
                </span>
              )}
            </div>
          </div>

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
            <button type="button" className="btn-ghost text-sm" onClick={clearAll}>
              Clear
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-[#dc2626]">
              <p>RentNinja could not generate this right now. Try again.</p>
              <p className="mt-1 font-semibold">{error}</p>
            </div>
          ) : null}
        </div>

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
            </div>
          ) : result ? (
            <div>
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

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <DecisionMetric label="Readiness" value={`${result.readiness}%`} />
                <DecisionMetric label="Risk" value={result.riskLevel} />
                <DecisionMetric label="Confidence" value={result.confidenceLevel} />
              </div>

              <div className="mt-3 rounded-2xl border border-[#b8c4d4] bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Affordability
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-semibold">
                    <span className="text-[#475569]">Income: </span>
                    {result.householdIncomeDisplay}
                  </p>
                  <p className="text-sm font-semibold">
                    <span className="text-[#475569]">Rent: </span>
                    {formatRentDisplay(result.monthlyRentAmount || null)}
                  </p>
                  <p className="text-sm font-bold text-[#ff4b1f]">
                    Ratio:{" "}
                    {formatAffordabilityDisplay(
                      result.normalizedMonthlyIncome,
                      result.monthlyRentAmount || null,
                    )}
                  </p>
                </div>
                {result.incomeWarning ? (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    {result.incomeWarning}
                  </p>
                ) : null}
              </div>

              <details className="mt-3 rounded-2xl border border-[#b8c4d4] bg-white p-4">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Edit income & rent
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1">
                    <span className="text-xs font-bold text-[#475569]">
                      Income amount
                    </span>
                    <input
                      type="number"
                      className="dashboard-input text-sm"
                      value={result.incomeAmount || ""}
                      onChange={(event) =>
                        recalculateAffordability({
                          incomeAmount: Number(event.target.value) || 0,
                        })
                      }
                      min="0"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-bold text-[#475569]">
                      Income frequency
                    </span>
                    <select
                      className="dashboard-input text-sm"
                      value={result.incomeFrequency}
                      onChange={(event) =>
                        recalculateAffordability({
                          incomeFrequency: event.target.value as IncomeFrequency,
                        })
                      }
                    >
                      <option value="yearly">Yearly</option>
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Biweekly</option>
                      <option value="hourly">Hourly</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </label>
                  {result.incomeFrequency === "hourly" ? (
                    <label className="grid gap-1">
                      <span className="text-xs font-bold text-[#475569]">
                        Hours per week
                      </span>
                      <input
                        type="number"
                        className="dashboard-input text-sm"
                        value={result.incomeHoursPerWeek ?? 40}
                        onChange={(event) =>
                          recalculateAffordability({
                            incomeHoursPerWeek: Number(event.target.value) || 40,
                          })
                        }
                        min="0"
                        max="168"
                      />
                    </label>
                  ) : null}
                  <label className="grid gap-1">
                    <span className="text-xs font-bold text-[#475569]">
                      Monthly rent
                    </span>
                    <input
                      type="number"
                      className="dashboard-input text-sm"
                      value={result.monthlyRentAmount || ""}
                      onChange={(event) =>
                        recalculateAffordability({
                          monthlyRentAmount: Number(event.target.value) || 0,
                        })
                      }
                      min="0"
                    />
                  </label>
                </div>
              </details>

              <p className="mt-3 rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#334155]">
                {result.confidenceReason}
              </p>

              <div className="mt-4 grid gap-3">
                <Insight label="Best next step" value={result.bestNextStep} accent />
                <Insight label="Main strength" value={result.mainStrength} />
                <Insight label="Main concern" value={result.mainConcern} />
              </div>

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

              <div className="mt-4 rounded-2xl border border-[#b8c4d4] bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                  Extracted details
                </p>
                <div className="mt-3 grid gap-2 text-sm font-semibold text-[#334155] sm:grid-cols-2">
                  {[
                    ["Phone", result.phone || "Not found"],
                    ["Email", result.email || "Not found"],
                    ["Move-in", result.moveInDate || "Not found"],
                    ["Employment", result.employmentInfo || "Not found"],
                    ["Voucher/subsidy", result.voucherInfo],
                    ["Tenant portion", result.tenantPortion],
                    ["Occupants", result.occupants],
                    ["Status", result.suggestedStatus],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-[#f8fafc] px-3 py-2">
                      <span className="font-black text-[#071126]">{label}: </span>
                      {value}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#ffccb5] bg-[#fff0ea] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                  Suggested message
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#334155]">
                  {result.suggestedMessage}
                </p>
              </div>

              {saveError ? (
                <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-[#dc2626]">
                  {saveError}
                </div>
              ) : null}

              {savedApplicantId ? (
                <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                  Applicant saved.{" "}
                  <Link
                    className="underline underline-offset-4"
                    href={`/dashboard/applicants/${savedApplicantId}`}
                  >
                    View saved applicant
                  </Link>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="btn-primary text-sm"
                  onClick={saveApplicant}
                  disabled={saving || Boolean(savedApplicantId)}
                >
                  {saving ? "Saving..." : savedApplicantId ? "Saved" : "Save Applicant"}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={copyMessage}
                  disabled={!result.suggestedMessage}
                >
                  {copied ? "Copied" : "Copy Message"}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={createOwnerReport}
                  disabled={saving}
                >
                  Create Owner Report
                </button>
                <Link className="btn-secondary text-sm" href="/dashboard/compare">
                  Compare
                </Link>
                <button type="button" className="btn-ghost text-sm" onClick={clearAll}>
                  Clear / Reset
                </button>
              </div>

              <p className="mt-4 rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3 text-sm font-black text-[#071126]">
                Applicant packet organized. Estimated time saved: 20 minutes.
              </p>
              <p className="mt-4 text-xs font-bold leading-5 text-[#475569]">
                Fair Housing Mode: On. RentNinja uses objective screening criteria
                only. Final decisions are your responsibility.
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
      className={`rounded-2xl border px-4 py-3 ${
        accent ? "border-[#ffccb5] bg-[#fff0ea]" : "border-[#b8c4d4] bg-white"
      }`}
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
