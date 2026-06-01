"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import type { ApplicantIntelligence } from "@/lib/applicant-intelligence";
import type { NextBestAction } from "@/lib/next-best-action";
import {
  calculateIncomeToRentRatio,
  formatRentDisplay,
  normalizeIncomeToMonthly,
  type IncomeFrequency,
} from "@/lib/income";
import {
  applicantStatusValues,
  normalizeApplicantStatus,
} from "@/lib/applicant-status";
import {
  getSavedMonthlyIncome,
  loadExistingApplicant,
  mergeApplicantUpdate,
  saveApplicantUpdate,
  type ApplicantMergeReviewRow,
} from "@/lib/applicant-update-merge";
import type { UpdateCategory } from "@/lib/applicant-update-classifier";
import { formatDueAtSigningBreakdown } from "@/lib/move-in-costs";

// ── Helpers ──────────────────────────────────────────────────────────────────
function readinessLabel(p: number) {
  if (p >= 85) return "Ready";
  if (p >= 70) return "Almost ready";
  if (p >= 40) return "Needs documents";
  return "Manual review";
}
function riskPillClass(risk: string) {
  if (risk === "Low") return "pill pill-success";
  if (risk === "Medium") return "pill pill-warning";
  return "pill pill-error";
}
function scoreColor(s: number) {
  if (s >= 80) return "text-[#059669]";
  if (s >= 65) return "text-[#d97706]";
  return "text-[#dc2626]";
}

function finiteNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function positiveFiniteNumber(value: unknown): number | null {
  const numeric = finiteNumber(value);
  return numeric !== null && numeric > 0 ? numeric : null;
}

function normalizeList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

// ── Types ────────────────────────────────────────────────────────────────────
type Props = {
  record: ApplicantRecord;
  intel: ApplicantIntelligence;
  nextAction: NextBestAction;
};
type TimelineItem = { type: string; summary: string; timestamp: string };
type ValueDiff = ApplicantMergeReviewRow;
const updateCategories: UpdateCategory[] = [
  "Landlord Terms",
  "Applicant Information",
  "Screening Documents",
  "AI Notes",
];
type AttachedFile = {
  id: string;
  filename: string;
  type: string;
  size: number;
  uploadedAt: string;
  category?: string;
};

export function ApplicantDetailClient({ record, intel, nextAction }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteSectionRef = useRef<HTMLDivElement>(null);
  const uploadSectionRef = useRef<HTMLDivElement>(null);

  // ── UI state ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Edit state ──
  const [editName, setEditName] = useState(record.name);
  const [editPhone, setEditPhone] = useState(record.phone);
  const [editEmail, setEditEmail] = useState(record.email);
  const [editRent, setEditRent] = useState(record.monthlyRent);
  const [editIncome, setEditIncome] = useState(
    record.applicantIncomeAmount ?? record.incomeAmount ?? record.normalizedMonthlyIncome ?? record.monthlyIncome,
  );
  const [editIncomeFrequency, setEditIncomeFrequency] = useState(record.applicantIncomeFrequency ?? record.incomeFrequency ?? "monthly");
  const [editSecurityDepositMonths, setEditSecurityDepositMonths] = useState(record.securityDepositMonths ?? 1);
  const [editFirstMonthDue, setEditFirstMonthDue] = useState(record.requireFirstMonthAtSigning !== false);
  const [editDueAtSigningOverride, setEditDueAtSigningOverride] = useState(record.dueAtSigningAmount ?? record.dueAtSigning ?? 0);
  const [editMoveIn, setEditMoveIn] = useState(record.moveInDate);
  const [editVoucher, setEditVoucher] = useState(record.housingSupport);
  const [editStatus, setEditStatus] = useState(normalizeApplicantStatus(record.status));
  const [editNotes, setEditNotes] = useState(record.notes.join("\n"));

  // ── Paste new info state ──
  const [pastedText, setPastedText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [diffs, setDiffs] = useState<ValueDiff[]>([]);
  const [mergedApplicant, setMergedApplicant] = useState<ApplicantRecord | null>(null);
  const [aiStatus, setAiStatus] = useState("");
  const [aiError, setAiError] = useState("");

  // ── Upload state ──
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // ── Timeline ──
  const [timeline, setTimeline] = useState<TimelineItem[]>([
    {
      type: "Created",
      summary: `Applicant record created`,
      timestamp: record.createdAt,
    },
    ...record.notes.map((n) => ({
      type: "Note",
      summary: n.slice(0, 100) + (n.length > 100 ? "…" : ""),
      timestamp: record.updatedAt,
    })),
  ]);

  // ── Affordability fix ──
  const normalizedMonthlyIncome = getSavedMonthlyIncome(record);
  const computedRatio = calculateIncomeToRentRatio(
    normalizedMonthlyIncome,
    finiteNumber(record.responsibleRent) || finiteNumber(record.monthlyRent),
  );
  const correctedRatio =
    positiveFiniteNumber(record.incomeToRentRatio) ??
    positiveFiniteNumber(record.affordabilityRatio) ??
    computedRatio;
  const ratioDisplay =
    correctedRatio !== null
      ? `${correctedRatio.toFixed(1)}x`
      : "Income-to-rent ratio not calculated — applicant income not available";
  const looksYearly = false;
  const monthlyIncomeDisplay =
    normalizedMonthlyIncome !== null
      ? `$${Math.round(normalizedMonthlyIncome).toLocaleString()}`
      : "Needs confirmation";
  const dueAtSigningAmount =
    positiveFiniteNumber(record.dueAtSigningAmount) ?? positiveFiniteNumber(record.dueAtSigning);
  const dueAtSigningDisplay =
    dueAtSigningAmount !== null
      ? `$${Math.round(dueAtSigningAmount).toLocaleString()}`
      : "Needs confirmation";
  const dueAtSigningBreakdown = dueAtSigningAmount
    ? formatDueAtSigningBreakdown({
        firstMonthRent: record.firstMonthRent ?? null,
        securityDeposit: record.securityDeposit ?? null,
        brokerFee: record.brokerFee ?? null,
        petFee: record.petFee ?? null,
        otherMoveInFees: record.otherMoveInFees ?? null,
      })
    : "Needs confirmation";
  const editNormalizedIncome = normalizeIncomeToMonthly({
    amount: editIncome || null,
    frequency: editIncomeFrequency as IncomeFrequency,
  });
  const editMonthlyIncome =
    editNormalizedIncome ?? (editIncomeFrequency === "monthly" ? editIncome : null);
  const editSecurityDeposit =
    editRent && editSecurityDepositMonths ? editRent * editSecurityDepositMonths : 0;
  const editFirstMonthRent = editFirstMonthDue ? editRent : 0;
  const editDueAtSigningCalculated =
    editDueAtSigningOverride || editFirstMonthRent + editSecurityDeposit;
  const editRatio = calculateIncomeToRentRatio(editMonthlyIncome, editRent || null);
  const summaryText = record.aiSummary || intel.confidenceReason;
  const visibleNotes = normalizeList(record.importantNotes).length
    ? normalizeList(record.importantNotes)
    : record.notes.filter((note) => !/^Raw reviewed text:/i.test(note));
  const strengths = normalizeList(record.aiStrengths).length
    ? normalizeList(record.aiStrengths)
    : [intel.mainStrength].filter(Boolean);
  const concerns = normalizeList(record.aiRedFlags).length
    ? normalizeList(record.aiRedFlags)
    : [intel.mainConcern, ...record.redFlags].filter(Boolean);
  const missingDocuments = normalizeList(record.missingDocuments).length
    ? normalizeList(record.missingDocuments)
    : intel.documentsMissing;
  const receivedDocuments = normalizeList(record.receivedDocuments).length
    ? normalizeList(record.receivedDocuments)
    : intel.documentsReceived;
  const followUpQuestions = normalizeList(record.followUpQuestions);
  const pastedSource = record.rawPastedText || record.sourceText || "";
  const documentSource = record.extractedDocumentText || record.documentExtracts || "";
  const rawSource = record.rawText || "";
  const uploadedFiles = record.uploadedFiles ?? [];

  // ── Scroll helpers ──
  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildApplicantPayload(
    overrides: Partial<ApplicantRecord> & Record<string, unknown> = {},
  ) {
    return {
      name: record.name,
      phone: record.phone,
      email: record.email,
      propertyAddress: record.propertyAddress,
      propertyId: record.propertyId ?? "",
      propertyUnit: record.propertyUnit ?? "",
      propertyNickname: record.propertyNickname ?? "",
      borough: record.borough ?? "",
      neighborhood: record.neighborhood ?? "",
      utilitiesIncluded: Boolean(record.utilitiesIncluded),
      bedrooms: record.bedrooms ?? null,
      bathrooms: record.bathrooms ?? null,
      propertyCity: record.propertyCity,
      propertyState: record.propertyState,
      propertyPostalCode: record.propertyPostalCode,
      moveInDate: record.moveInDate,
      coApplicants: record.coApplicants,
      applicationSource: record.applicationSource,
      monthlyRent: record.monthlyRent,
      propertyMonthlyRent: record.propertyMonthlyRent ?? record.monthlyRent,
      rentSource: record.rentSource ?? "",
      incomeSource: record.incomeSource ?? "",
      dueAtSigningSource: record.dueAtSigningSource ?? "",
      securityDepositMonths: record.securityDepositMonths ?? 1,
      requireFirstMonthAtSigning: record.requireFirstMonthAtSigning !== false,
      financialFieldsCorrected: Boolean(record.financialFieldsCorrected),
      financialCorrectionNote: record.financialCorrectionNote ?? "",
      monthlyIncome: record.monthlyIncome,
      dueAtSigning: record.dueAtSigning ?? 0,
      dueAtSigningAmount: record.dueAtSigningAmount ?? record.dueAtSigning ?? 0,
      dueAtSigningRawText: record.dueAtSigningRawText ?? "",
      dueAtSigningNeedsConfirmation: Boolean(record.dueAtSigningNeedsConfirmation),
      applicantGrossMonthlyIncome: record.applicantGrossMonthlyIncome ?? record.normalizedMonthlyIncome ?? null,
      applicantAnnualIncome: record.applicantAnnualIncome ?? null,
      applicantIncomeAmount: record.applicantIncomeAmount ?? record.incomeAmount ?? null,
      applicantIncomeFrequency: record.applicantIncomeFrequency ?? record.incomeFrequency ?? "unknown",
      tenantPortion: record.tenantPortion ?? record.tenantPortionRent ?? 0,
      voucherPortion: record.voucherPortion ?? record.monthlySubsidyAmount ?? 0,
      securityDepositAmount: record.securityDepositAmount ?? record.securityDeposit ?? 0,
      firstMonthRentAmount: record.firstMonthRentAmount ?? record.firstMonthRent ?? 0,
      securityDeposit: record.securityDeposit ?? 0,
      firstMonthRent: record.firstMonthRent ?? 0,
      brokerFee: record.brokerFee ?? 0,
      petFee: record.petFee ?? 0,
      otherMoveInFees: record.otherMoveInFees ?? 0,
      incomeAmount: record.incomeAmount ?? null,
      incomeFrequency: record.incomeFrequency ?? "unknown",
      normalizedMonthlyIncome:
        record.normalizedMonthlyIncome ?? record.monthlyIncome,
      incomeToRentRatio: record.incomeToRentRatio ?? null,
      housingSupport: record.housingSupport,
      supportProgram: record.supportProgram,
      monthlySubsidyAmount: record.monthlySubsidyAmount,
      tenantPortionRent: record.tenantPortionRent,
      subsidyStatus: record.subsidyStatus,
      inspectionStatus: record.inspectionStatus,
      creditScore: record.creditScore ?? 0,
      residentScore: record.residentScore,
      rentalHistoryScore: record.scores.rentalHistory,
      rulesComplianceScore: record.scores.rulesCompliance,
      timelineScore: record.scores.timeline,
      communicationScore: record.scores.communication,
      documentationScore: record.scores.documentation,
      notes: record.notes,
      rawText: record.rawText ?? "",
      rawPastedText: record.rawPastedText ?? "",
      sourceText: record.sourceText ?? "",
      extractedDocumentText: record.extractedDocumentText ?? "",
      documentExtracts: record.documentExtracts ?? "",
      summary: record.aiSummary ?? "",
      aiRecommendedStatus: record.aiRecommendedStatus ?? "",
      concerns: record.aiRedFlags ?? [],
      strengths: record.aiStrengths ?? [],
      suggestedMessage: record.suggestedMessage ?? "",
      extractedFieldSummary: record.extractedFieldSummary ?? "",
      missingDocuments: record.missingDocuments ?? [],
      receivedDocuments: record.receivedDocuments ?? [],
      followUpQuestions: record.followUpQuestions ?? [],
      importantNotes: record.importantNotes ?? [],
      nextStep: record.nextStep ?? record.aiRecommendation ?? "",
      extractedFields: record.extractedFields ?? {},
      uploadedFiles: record.uploadedFiles ?? [],
      updateHistory: record.updateHistory ?? [],
      status: normalizeApplicantStatus(record.status),
      ...overrides,
    };
  }

  // ── Delete ──
  async function deleteApplicant() {
    setDeleting(true);
    try {
      await fetch(`/api/applicants/${record._id}`, { method: "DELETE" });
      router.push("/dashboard");
    } catch {
      alert("Could not delete applicant.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Save edits ──
  async function saveEdits() {
    setSaving(true);
    setSaveMessage("");
    try {
      await fetch(`/api/applicants/${record._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildApplicantPayload({
          name: editName,
          phone: editPhone,
          email: editEmail,
          monthlyRent: editRent,
          propertyMonthlyRent: editRent,
          rentSource: "Manual correction",
          incomeSource: "Manual correction",
          monthlyIncome: editMonthlyIncome ?? editIncome,
          applicantGrossMonthlyIncome: editMonthlyIncome,
          applicantAnnualIncome: editIncomeFrequency === "yearly" ? editIncome : null,
          applicantIncomeAmount: editIncome || null,
          applicantIncomeFrequency: editIncomeFrequency,
          incomeAmount: editIncome || null,
          incomeFrequency: editIncomeFrequency,
          normalizedMonthlyIncome: editMonthlyIncome,
          incomeToRentRatio: editRatio,
          securityDepositMonths: editSecurityDepositMonths,
          requireFirstMonthAtSigning: editFirstMonthDue,
          firstMonthRent: editFirstMonthRent,
          firstMonthRentAmount: editFirstMonthRent,
          securityDeposit: editSecurityDeposit,
          securityDepositAmount: editSecurityDeposit,
          dueAtSigning: editDueAtSigningCalculated,
          dueAtSigningAmount: editDueAtSigningCalculated,
          dueAtSigningNeedsConfirmation: !editDueAtSigningCalculated,
          dueAtSigningSource: editDueAtSigningOverride ? "Manual override" : "Calculated from rent + security",
          moveInDate: editMoveIn,
          housingSupport: editVoucher,
          status: normalizeApplicantStatus(editStatus),
          notes: editNotes.split("\n").filter(Boolean),
        })),
      });
      setShowEdit(false);
      setSaveMessage("Applicant updated.");
      router.refresh();
    } catch {
      setSaveMessage("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  // ── Analyze pasted text ──
  async function analyzePastedText() {
    if (!pastedText.trim()) return;
    setAnalyzing(true);
    setAiError("");
    setDiffs([]);
    setMergedApplicant(null);
    try {
      const existing = await loadExistingApplicant<ApplicantRecord>(
        record._id,
        record,
      );
      const merge = mergeApplicantUpdate(existing, pastedText);

      setDiffs(merge.reviewRows);
      setMergedApplicant(merge.mergedApplicant);
      setAiStatus(
        merge.reviewRows.length
          ? "AI merged new information with saved applicant record."
          : "No new information detected in the pasted text.",
      );
    } catch (e: any) {
      setAiError(e.message || "Unable to analyze. Try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  // ── Apply AI updates ──
  async function applyAiUpdates() {
    setSaving(true);
    setAiError("");
    try {
      if (!mergedApplicant) {
        throw new Error("Analyze the new information before applying updates.");
      }
      await saveApplicantUpdate(record._id, buildApplicantPayload(mergedApplicant) as ApplicantRecord);
      setTimeline((t) => [
        ...t,
        {
          type: "AI Update",
          summary: `New info analyzed and applied`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setPastedText("");
      setDiffs([]);
      setMergedApplicant(null);
      setAiStatus("Applicant updated with new info.");
      router.refresh();
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Could not save updates.");
    } finally {
      setSaving(false);
    }
  }

  // ── Upload files ──
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFiles(Array.from(e.target.files ?? []));
  }
  function attachFiles() {
    const newFiles: AttachedFile[] = selectedFiles.map((f, i) => ({
      id: `file-${Date.now()}-${i}`,
      filename: f.name,
      type: f.type,
      size: f.size,
      uploadedAt: new Date().toISOString().toString(),
      category: guessCategory(f.name),
    }));
    setAttachedFiles((prev) => [...prev, ...newFiles]);
    setTimeline((t) => [
      ...t,
      {
        type: "File Upload",
        summary: `${newFiles.length} file(s) attached. Document scanning coming soon.`,
        timestamp: new Date().toISOString(),
      },
    ]);
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
  function guessCategory(name: string) {
    const n = name.toLowerCase();
    if (n.includes("id") || n.includes("license") || n.includes("passport"))
      return "Photo ID";
    if (n.includes("pay") || n.includes("stub") || n.includes("income"))
      return "Pay Stub";
    if (n.includes("bank") || n.includes("statement")) return "Bank Statement";
    if (n.includes("landlord") || n.includes("reference"))
      return "Landlord Reference";
    if (n.includes("voucher") || n.includes("subsidy") || n.includes("section"))
      return "Voucher";
    if (n.includes("applic") || n.includes("rental")) return "Application";
    return "Other";
  }
  function removeFile(id: string) {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          TOP HERO CARD
          ════════════════════════════════════════════════════════════════════ */}
      {record.financialFieldsCorrected ? (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {record.financialCorrectionNote || "Financial fields were corrected from source data."}
        </div>
      ) : null}
      <section className="card overflow-hidden">
        <div className="px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill pill-info">{record.status}</span>
                <span className={riskPillClass(intel.riskLevel)}>
                  {intel.riskLevel} risk
                </span>
                <span className="pill pill-success">
                  {readinessLabel(intel.readiness)}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
                {record.name}
              </h1>
              <p className="mt-1 text-sm text-[#475569]">
                {record.email} | {record.phone} | {record.propertyCity},{" "}
                {record.propertyState}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {record.phone && (
                <>
                  <a
                    href={`tel:${record.phone}`}
                    className="btn-secondary text-sm !min-h-[40px] !px-4 !py-2"
                  >
                    Call
                  </a>
                  <a
                    href={`sms:${record.phone}`}
                    className="btn-secondary text-sm !min-h-[40px] !px-4 !py-2"
                  >
                    Text
                  </a>
                </>
              )}
              {record.email && (
                <a
                  href={`mailto:${record.email}`}
                  className="btn-secondary text-sm !min-h-[40px] !px-4 !py-2"
                >
                  Email
                </a>
              )}
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricBox
              label="Score"
              value={`${intel.score}/100`}
              accent={scoreColor(intel.score)}
            />
            <MetricBox
              label="Readiness"
              value={`${intel.readiness}%`}
              accent="text-[#ff4b1f]"
            />
            <MetricBox
              label="Affordability"
              value={ratioDisplay}
            />
            <MetricBox label="Risk" value={intel.riskLevel} />
          </div>

          {/* Next best action */}
          <div className="mt-4 rounded-xl border border-[#ffccb5] bg-[#fff0ea] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#ff4b1f]">
              Next Step
            </p>
            <p className="mt-1 text-sm font-bold">
              {nextAction.nextBestActionLabel}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#475569]">
              {nextAction.nextBestActionReason}
            </p>
          </div>
        </div>

        {/* ── Expanded Actions bar ── */}
        <div className="border-t border-[#e8eef6] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/messages" className="btn-primary text-sm">
              Generate Message
            </Link>
            <Link href="/dashboard/reports" className="btn-secondary text-sm">
              Owner Report
            </Link>
            <Link href="/dashboard/compare" className="btn-secondary text-sm">
              Compare
            </Link>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => scrollTo(pasteSectionRef)}
            >
              Add New Info
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setShowEdit(!showEdit)}
            >
              {showEdit ? "Cancel Edit" : "Edit Applicant"}
            </button>
            <button
              type="button"
              className="btn-ghost text-sm !text-[#dc2626] hover:!bg-[#fef2f2]"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Edit form */}
        {showEdit && (
          <div className="border-t border-[#e8eef6] px-5 py-4 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f] mb-4">
              Edit Applicant
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <EditField label="Name" value={editName} onChange={setEditName} />
              <EditField
                label="Phone"
                value={editPhone}
                onChange={setEditPhone}
              />
              <EditField
                label="Email"
                value={editEmail}
                onChange={setEditEmail}
              />
              <EditField
                label="Property monthly rent"
                type="number"
                value={String(editRent || "")}
                onChange={(v) => setEditRent(parseFloat(v) || 0)}
                min="0"
              />
              <label className="grid gap-1">
                <span className="text-xs font-bold text-[#475569]">
                  Monthly income
                </span>
                <input
                  type="number"
                  className="dashboard-input text-sm"
                  value={editIncome || ""}
                  onChange={(e) =>
                    setEditIncome(parseFloat(e.target.value) || 0)
                  }
                  min="0"
                />
                {looksYearly && (
                  <span className="text-[10px] text-amber-700">
                    Detected as yearly — will be divided by 12 on save.
                  </span>
                )}
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-[#475569]">
                  Income frequency
                </span>
                <select
                  className="dashboard-input text-sm"
                  value={editIncomeFrequency}
                  onChange={(e) => setEditIncomeFrequency(e.target.value as IncomeFrequency)}
                >
                  {["monthly", "yearly", "weekly", "biweekly", "hourly", "unknown"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <EditField
                label="Security deposit months"
                type="number"
                value={String(editSecurityDepositMonths || "")}
                onChange={(v) => setEditSecurityDepositMonths(parseFloat(v) || 0)}
                min="0"
              />
              <label className="flex items-center gap-2 rounded-2xl border border-[#b8c4d4] px-3 py-2 text-sm font-bold text-[#475569]">
                <input
                  type="checkbox"
                  checked={editFirstMonthDue}
                  onChange={(e) => setEditFirstMonthDue(e.target.checked)}
                />
                First month due at signing
              </label>
              <EditField
                label="Due at signing override"
                type="number"
                value={String(editDueAtSigningOverride || "")}
                onChange={(v) => setEditDueAtSigningOverride(parseFloat(v) || 0)}
                min="0"
              />
              <div className="rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-3 py-2 text-sm font-semibold">
                <p>New ratio: {editRatio ? `${editRatio.toFixed(1)}x rent` : "Needs confirmation"}</p>
                <p>Due at signing: ${Math.round(editDueAtSigningCalculated || 0).toLocaleString()}</p>
              </div>
              <EditField
                label="Move-in Date"
                type="date"
                value={editMoveIn}
                onChange={setEditMoveIn}
              />
              <label className="grid gap-1">
                <span className="text-xs font-bold text-[#475569]">
                  Voucher / Subsidy
                </span>
                <select
                  className="dashboard-input text-sm"
                  value={editVoucher}
                  onChange={(e) => setEditVoucher(e.target.value as any)}
                >
                  {["None", "Voucher", "Subsidy"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold text-[#475569]">Status</span>
                <select
                  className="dashboard-input text-sm"
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(normalizeApplicantStatus(e.target.value))
                  }
                >
                  {applicantStatusValues.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 grid gap-1">
              <span className="text-xs font-bold text-[#475569]">Notes</span>
              <textarea
                className="dashboard-input min-h-[80px] text-sm"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={saving}
                onClick={saveEdits}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => setShowEdit(false)}
              >
                Cancel
              </button>
            </div>
            {saveMessage && (
              <p className="mt-2 text-sm font-bold text-[#059669]">
                {saveMessage}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          A. PASTE NEW INFO
          ════════════════════════════════════════════════════════════════════ */}
      <section ref={pasteSectionRef} className="card p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
          Update Applicant with New Info
        </p>
        <h2 className="mt-1 text-lg font-bold">Paste New Info</h2>
        <textarea
          className="dashboard-input mt-3 min-h-[120px] text-sm"
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste new Zillow messages, text messages, application notes, employment details, references, or document text for this applicant..."
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={analyzing || !pastedText.trim()}
            onClick={analyzePastedText}
          >
            {analyzing ? "Analyzing..." : "Analyze & Update Applicant"}
          </button>
        </div>

        {aiError && (
          <p className="mt-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-semibold text-[#dc2626]">
            {aiError}
          </p>
        )}
        {aiStatus && !aiError && (
          <p className="mt-3 text-sm font-semibold text-[#059669]">
            {aiStatus}
          </p>
        )}

        {/* Diffs panel */}
        {diffs.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[#ffccb5] bg-[#fff0ea] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
              AI merged new information with saved applicant record.
            </p>
            <p className="mt-1 text-xs font-medium text-[#475569]">
              Review the current saved value, the new information found, and
              the final merged value before saving.
            </p>
            <div className="mt-3 grid gap-3">
              {updateCategories.map((category) => {
                const items = diffs.filter((diff) => diff.category === category);
                if (items.length === 0) return null;

                return (
                  <div key={category}>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                      {category}
                    </p>
                    <div className="mt-2 grid gap-2">
                      {items.map((d, index) => (
                        <div
                          key={`${d.category}-${d.field}-${index}`}
                          className="card-inner px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold text-[#475569]">
                              {d.label} ·{" "}
                              <span className="text-[#0369a1]">
                                {d.confidence} confidence
                              </span>
                            </p>
                            <span
                              className={
                                d.willApply
                                  ? "pill pill-success"
                                  : "pill pill-warning"
                              }
                            >
                              {d.willApply ? "Will apply" : "Preserved"}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-2 text-sm lg:grid-cols-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                                Current saved value
                              </p>
                              <span className="text-[#dc2626] line-through">
                                {d.currentValue}
                              </span>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                                New information found
                              </p>
                              <span className="font-bold text-[#0369a1]">
                                {d.newInfo}
                              </span>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                                Final merged value
                              </p>
                              <span className="font-bold text-[#059669]">
                                {d.finalValue}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-xs font-medium text-[#475569]">
                            {d.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={applyAiUpdates}
                disabled={saving}
              >
                Apply Updates
              </button>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => {
                  setDiffs([]);
                  setMergedApplicant(null);
                  setAiStatus("");
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          B. UPLOAD DOCUMENTS
          ════════════════════════════════════════════════════════════════════ */}
      <section ref={uploadSectionRef} className="card p-5 sm:p-6">
        <h2 className="text-lg font-bold">Upload Documents</h2>
        <p className="mt-1 text-sm text-[#475569]">
          Attach pay stubs, bank statements, references, IDs, or screenshots.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.doc,.docx"
            className="text-sm"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={selectedFiles.length === 0}
            onClick={attachFiles}
          >
            Attach Files
          </button>
        </div>
        {attachedFiles.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              Attached Documents ({attachedFiles.length})
            </p>
            <div className="mt-2 space-y-2">
              {attachedFiles.map((f) => (
                <div
                  key={f.id}
                  className="card-inner flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {f.filename}
                      {f.category ? (
                        <span className="ml-2 pill pill-info">
                          {f.category}
                        </span>
                      ) : (
                        ""
                      )}
                    </p>
                    <p className="text-xs text-[#475569]">
                      {(f.size / 1024).toFixed(0)} KB ·{" "}
                      {new Date(f.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost text-xs !text-[#dc2626]"
                    onClick={() => removeFile(f.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-3 text-xs font-medium text-[#475569]">
          Document scanning coming soon. Files are stored locally for now.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CARDS
          ════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Summary">
          <div className="card-inner px-4 py-3">
            <p className="text-xs font-bold text-[#475569]">Applicant summary</p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6">
              {summaryText || "No AI summary saved yet."}
            </p>
          </div>
          <Field
            label="AI recommendation"
            value={record.aiRecommendedStatus || "Not provided"}
          />
          <Field label="Saved status" value={record.status} />
          <Field label="Decision" value={intel.verdict} />
          <Field
            label="Strength"
            value={strengths[0] ?? "Calculating..."}
          />
          <Field
            label="Concern"
            value={concerns[0] ?? "None identified"}
          />
        </Card>
        <Card title="Missing Documents">
          {missingDocuments.length === 0 ? (
            <p className="text-sm text-[#475569]">All documents complete</p>
          ) : (
            <ul className="space-y-2">
              {missingDocuments.map((d) => (
                <li
                  key={d}
                  className="card-inner flex items-center gap-3 px-4 py-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fef2f2] text-xs font-bold text-[#dc2626]">
                    !
                  </span>
                  <span className="text-sm font-semibold">{d}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Strengths & Concerns">
          {strengths.map((strength) => (
            <div key={strength} className="card-inner px-4 py-3">
              <p className="text-xs font-bold text-[#059669]">Strength</p>
              <p className="mt-1 text-sm font-semibold">{strength}</p>
            </div>
          ))}
          {concerns.map((concern) => (
            <div key={concern} className="card-inner px-4 py-3">
              <p className="text-xs font-bold text-[#d97706]">Concern</p>
              <p className="mt-1 text-sm font-semibold">{concern}</p>
            </div>
          ))}
          {record.redFlags.length > 0 && (
            <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3">
              <p className="text-xs font-bold text-[#dc2626]">Red Flags</p>
              <ul className="mt-1 list-inside list-disc text-sm font-medium text-[#dc2626]">
                {record.redFlags.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <Card title="Affordability">
          <div className="grid grid-cols-2 gap-2">
            <Mini
              label="Monthly Rent"
              value={formatRentDisplay(finiteNumber(record.monthlyRent))}
            />
            <Mini
              label="Rent Source"
              value={record.rentSource || "Needs confirmation"}
            />
            <Mini
              label="Income"
              value={monthlyIncomeDisplay}
            />
            <Mini
              label="Income Source"
              value={record.incomeSource || "Needs confirmation"}
            />
            <Mini
              label="Ratio"
              value={ratioDisplay}
            />
            <Mini
              label="Due at Signing"
              value={dueAtSigningDisplay}
            />
            <Mini
              label="Breakdown"
              value={dueAtSigningBreakdown}
            />
            <Mini
              label="Due Source"
              value={record.dueAtSigningSource || "Needs confirmation"}
            />
            <Mini
              label="Security"
              value={
                record.securityDeposit && record.securityDeposit > 0
                  ? `$${record.securityDeposit.toLocaleString()}`
                  : "Needs confirmation"
              }
            />
            <Mini label="Voucher" value={record.housingSupport} />
          </div>
        </Card>
        <Card title="Notes & Activity">
          {visibleNotes.length === 0 ? (
            <p className="text-sm text-[#475569]">No notes yet.</p>
          ) : (
            visibleNotes.map((n, i) => (
              <div key={i} className="card-inner px-4 py-3">
                <p className="text-xs font-medium text-[#475569] whitespace-pre-wrap">
                  {n}
                </p>
              </div>
            ))
          )}
        </Card>
        <Card title="Received Documents">
          {receivedDocuments.length === 0 ? (
            <p className="text-sm text-[#475569]">No documents confirmed yet.</p>
          ) : (
            receivedDocuments.map((item) => (
              <div key={item} className="card-inner px-4 py-3 text-sm font-semibold">
                {item}
              </div>
            ))
          )}
        </Card>
        <Card title="Suggested Next Step">
          <Field label="Next step" value={record.aiRecommendation || record.nextStep || nextAction.nextBestActionLabel} />
          {followUpQuestions.length > 0 ? (
            <div className="card-inner px-4 py-3">
              <p className="text-xs font-bold text-[#475569]">Follow-up questions</p>
              <ul className="mt-2 list-inside list-disc text-sm font-semibold">
                {followUpQuestions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {record.suggestedMessage ? (
            <div className="card-inner px-4 py-3">
              <p className="text-xs font-bold text-[#475569]">Suggested message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6">
                {record.suggestedMessage}
              </p>
            </div>
          ) : null}
        </Card>
      </div>

      <details className="card p-5 sm:p-6">
        <summary className="cursor-pointer font-bold text-[#475569]">
          Source material / audit trail
        </summary>
        <div className="mt-4 grid gap-3">
          <AuditBlock title="Original pasted text" value={pastedSource || rawSource} />
          <AuditBlock title="Extracted document text" value={documentSource} />
          <div className="card-inner px-4 py-3">
            <p className="text-xs font-bold text-[#475569]">Uploaded files</p>
            {uploadedFiles.length === 0 ? (
              <p className="mt-1 text-sm font-semibold">No uploaded files saved.</p>
            ) : (
              <div className="mt-2 grid gap-2">
                {uploadedFiles.map((file) => (
                  <p key={`${file.filename}-${file.uploadedAt}`} className="text-sm font-semibold">
                    {file.filename} · {(file.size / 1024).toFixed(0)} KB · {file.extractionStatus}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>

      {/* ═══════════════════════════════════════════════════════════════════════
          C. ACTIVITY / TIMELINE
          ════════════════════════════════════════════════════════════════════ */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
          Activity Timeline
        </h2>
        <div className="mt-3 space-y-2">
          {timeline
            .slice()
            .reverse()
            .map((t, i) => (
              <div
                key={i}
                className="card-inner flex items-start gap-3 px-4 py-3"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8eef6] text-[10px] font-bold text-[#475569]">
                  {t.type === "Created" ? "●" : "○"}
                </span>
                <div>
                  <p className="text-xs font-bold text-[#475569]">
                    {t.type} · {new Date(t.timestamp).toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-[#475569]">{t.summary}</p>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Advanced details */}
      <details className="card p-5 sm:p-6">
        <summary className="cursor-pointer font-bold text-[#475569]">
          Advanced Details
        </summary>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Source", record.applicationSource],
            ["Property", record.propertyNickname || record.propertyAddress || "N/A"],
            ["Unit", record.propertyUnit || "N/A"],
            ["Neighborhood", record.neighborhood || record.borough || "N/A"],
            ["Utilities", record.utilitiesIncluded ? "Included" : "Not included / unknown"],
            ["Move-in", record.moveInDate || "Not provided"],
            [
              "Resident Score",
              record.residentScore > 0 ? record.residentScore : "N/A",
            ],
            ["Subsidy Program", record.supportProgram || "N/A"],
            [
              "Tenant Portion",
              record.tenantPortionRent > 0
                ? `$${record.tenantPortionRent}`
                : "N/A",
            ],
            [
              "Due at Signing",
              dueAtSigningDisplay,
            ],
            [
              "Due at Signing Breakdown",
              dueAtSigningBreakdown,
            ],
            [
              "Security Deposit",
              record.securityDeposit && record.securityDeposit > 0
                ? `$${record.securityDeposit.toLocaleString()}`
                : "Needs confirmation",
            ],
            ["Subsidy Status", record.subsidyStatus],
            ["Inspection", record.inspectionStatus],
            ["Created", new Date(record.createdAt).toLocaleDateString()],
          ].map(([l, v]) => (
            <div key={l} className="card-inner px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                {l}
              </p>
              <p className="mt-1 text-sm font-semibold">{v}</p>
            </div>
          ))}
        </div>
      </details>

      {/* Compliance */}
      <div className="rounded-xl border border-[#b8c4d4] bg-white px-4 py-3 text-center text-xs font-bold text-[#475569]">
        Fair Housing Mode: On. RentNinja uses objective screening criteria only.
        Final decisions are your responsibility.
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-3 bottom-24 z-30 flex gap-2 rounded-[24px] border border-[#b8c4d4] bg-white/95 p-2 shadow-[0_14px_30px_rgba(15,23,42,0.18)] backdrop-blur lg:hidden">
        <Link
          href="/dashboard/messages"
          className="field-action flex-1 !px-2 !text-xs"
        >
          Message
        </Link>
        <button
          type="button"
          className="field-action flex-1 !px-2 !text-xs"
          onClick={() => setShowEdit(!showEdit)}
        >
          Edit
        </button>
        <button
          type="button"
          className="field-action flex-1 !px-2 !text-xs !text-[#dc2626]"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete
        </button>
      </div>

      {/* Delete modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="card max-w-sm w-full p-6">
            <p className="text-sm font-bold">Delete {record.name}?</p>
            <p className="mt-2 text-sm text-[#475569]">
              This cannot be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="btn-ghost text-sm flex-1"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-sm flex-1 !bg-[#dc2626] hover:!bg-[#b91c1c]"
                onClick={deleteApplicant}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Applicant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub components ────────────────────────────────────────────────────────────
function MetricBox({
  label,
  value,
  accent,
  subtitle,
}: {
  label: string;
  value: React.ReactNode;
  accent?: string;
  subtitle?: string;
}) {
  return (
    <div className="card-inner px-4 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
        {label}
      </p>
      <p className={`mt-1 text-xl font-black ${accent ?? ""}`}>{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-[10px] font-medium text-amber-700">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
        {title}
      </h2>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-inner px-4 py-3">
      <p className="text-xs font-bold text-[#475569]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function AuditBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="card-inner px-4 py-3">
      <p className="text-xs font-bold text-[#475569]">{title}</p>
      {value ? (
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f8fafc] p-3 text-xs font-medium leading-5 text-[#334155]">
          {value}
        </pre>
      ) : (
        <p className="mt-1 text-sm font-semibold">No source text saved.</p>
      )}
    </div>
  );
}

function Mini({
  label,
  value,
  accent,
  subtitle,
}: {
  label: string;
  value: string;
  accent?: boolean;
  subtitle?: string;
}) {
  return (
    <div className="card-inner px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold ${accent ? "text-[#ff4b1f]" : ""}`}>
        {value}
      </p>
      {subtitle && (
        <span className="text-xs font-medium text-amber-700 block">
          {subtitle}
        </span>
      )}
    </div>
  );
}

function EditField({
  label,
  type = "text",
  value,
  onChange,
  min,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold text-[#475569]">{label}</span>
      <input
        type={type}
        className="dashboard-input text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
      />
    </label>
  );
}
