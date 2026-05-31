"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import type { ApplicantIntelligence } from "@/lib/applicant-intelligence";
import type { NextBestAction } from "@/lib/next-best-action";
import { calculateIncomeToRentRatio, formatRentDisplay } from "@/lib/income";

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

// ── Types ────────────────────────────────────────────────────────────────────
type Props = {
  record: ApplicantRecord;
  intel: ApplicantIntelligence;
  nextAction: NextBestAction;
};
type TimelineItem = { type: string; summary: string; timestamp: string };
type ValueDiff = {
  field: string;
  oldValue: string;
  newValue: string;
  confidence: string;
};
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
  const [editIncome, setEditIncome] = useState(record.monthlyIncome);
  const [editMoveIn, setEditMoveIn] = useState(record.moveInDate);
  const [editVoucher, setEditVoucher] = useState(record.housingSupport);
  const [editStatus, setEditStatus] = useState(record.status);
  const [editNotes, setEditNotes] = useState(record.notes.join("\n"));

  // ── Paste new info state ──
  const [pastedText, setPastedText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [diffs, setDiffs] = useState<ValueDiff[]>([]);
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
  const normalizedMonthlyIncome =
    finiteNumber(record.normalizedMonthlyIncome) ?? finiteNumber(record.monthlyIncome);
  const computedRatio = calculateIncomeToRentRatio(
    normalizedMonthlyIncome,
    finiteNumber(record.responsibleRent) || finiteNumber(record.monthlyRent),
  );
  const correctedRatio =
    finiteNumber(record.incomeToRentRatio) ??
    finiteNumber(record.affordabilityRatio) ??
    computedRatio;
  const ratioDisplay =
    correctedRatio !== null ? `${correctedRatio.toFixed(1)}x` : "Needs confirmation";
  const looksYearly = false;
  const monthlyIncomeDisplay =
    normalizedMonthlyIncome !== null
      ? `$${Math.round(normalizedMonthlyIncome).toLocaleString()}`
      : "Needs confirmation";

  // ── Scroll helpers ──
  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          email: editEmail,
          monthlyRent: editRent,
          monthlyIncome: editIncome,
          moveInDate: editMoveIn,
          housingSupport: editVoucher,
          status: editStatus,
          notes: editNotes.split("\n").filter(Boolean),
        }),
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
    try {
      const res = await fetch("/api/ai/one-minute-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: pastedText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Build diffs
      const changes: ValueDiff[] = [];
      const c = (f: string, o: string, n: string) => {
        if (n && n !== o && n !== "Not found")
          changes.push({
            field: f,
            oldValue: o || "(empty)",
            newValue: n,
            confidence: data.confidenceLevel,
          });
      };

      c(
        "Income",
        record.monthlyIncome ? `$${record.monthlyIncome}` : "",
        `${data.affordabilityDisplay} (${data.householdIncomeDisplay ?? data.householdIncome})`,
      );
      c(
        "Rent",
        record.monthlyRent ? `$${record.monthlyRent}` : "",
        data.monthlyRent,
      );
      c("Phone", record.phone, data.phone);
      c("Email", record.email, data.email);
      c("Move-in", record.moveInDate, data.moveInDate);
      if (data.suggestedStatus && data.suggestedStatus !== record.status)
        changes.push({
          field: "Status",
          oldValue: record.status,
          newValue: data.suggestedStatus,
          confidence: "Medium",
        });
      if (data.mainStrength && data.mainStrength !== intel.mainStrength)
        changes.push({
          field: "Strength",
          oldValue: intel.mainStrength ?? "",
          newValue: data.mainStrength,
          confidence: "Medium",
        });
      if (data.mainConcern && data.mainConcern !== intel.mainConcern)
        changes.push({
          field: "Concern",
          oldValue: intel.mainConcern ?? "",
          newValue: data.mainConcern,
          confidence: "Medium",
        });
      if (data.missingDocuments?.length)
        changes.push({
          field: "Missing docs",
          oldValue: intel.documentsMissing.join(", ") || "None",
          newValue: data.missingDocuments.join(", "),
          confidence: "Medium",
        });

      setDiffs(changes);
      setAiStatus(
        changes.length
          ? "AI found potential updates"
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
    try {
      // Build merged notes
      const updatedNotes = [
        ...record.notes,
        `New info analyzed: ${pastedText.slice(0, 200)}${pastedText.length > 200 ? "…" : ""}`,
      ];
      // Build merged fields from diffs
      const patch: any = { notes: updatedNotes };
      for (const d of diffs) {
        if (d.field === "Income")
          patch.monthlyIncome = record.monthlyIncome; // keep existing, user can edit
        else if (d.field === "Rent")
          patch.monthlyRent =
            parseFloat(d.newValue.replace(/[^0-9.]/g, "")) ||
            record.monthlyRent;
        else if (d.field === "Phone") patch.phone = d.newValue;
        else if (d.field === "Email") patch.email = d.newValue;
        else if (d.field === "Move-in") patch.moveInDate = d.newValue;
        else if (d.field === "Status") patch.status = d.newValue;
      }
      await fetch(`/api/applicants/${record._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
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
      setAiStatus("Applicant updated with new info.");
      router.refresh();
    } catch {
      setAiError("Could not save updates.");
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
                label="Monthly Rent"
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
                  onChange={(e) => setEditStatus(e.target.value as any)}
                >
                  {[
                    "New",
                    "Screening",
                    "Review",
                    "Missing Documents",
                    "Ready for Review",
                    "Manual Review",
                    "Strong Candidate",
                    "Approved",
                    "Declined",
                    "Leased",
                  ].map((s) => (
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
              AI found these updates
            </p>
            <div className="mt-3 grid gap-2">
              {diffs.map((d) => (
                <div key={d.field} className="card-inner px-4 py-3">
                  <p className="text-xs font-bold text-[#475569]">
                    {d.field} ·{" "}
                    <span className="text-[#0369a1]">
                      {d.confidence} confidence
                    </span>
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-[#dc2626] line-through">
                        {d.oldValue}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#059669] font-bold">
                        {d.newValue}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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
          <Field label="Decision" value={intel.verdict} />
          <Field
            label="Strength"
            value={intel.mainStrength ?? "Calculating..."}
          />
          <Field
            label="Concern"
            value={intel.mainConcern ?? "None identified"}
          />
        </Card>
        <Card title="Missing Documents">
          {intel.documentsMissing.length === 0 ? (
            <p className="text-sm text-[#475569]">All documents complete</p>
          ) : (
            <ul className="space-y-2">
              {intel.documentsMissing.map((d) => (
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
          <div className="card-inner px-4 py-3">
            <p className="text-xs font-bold text-[#059669]">Strength</p>
            <p className="mt-1 text-sm font-semibold">{intel.mainStrength}</p>
          </div>
          <div className="card-inner px-4 py-3">
            <p className="text-xs font-bold text-[#d97706]">Concern</p>
            <p className="mt-1 text-sm font-semibold">{intel.mainConcern}</p>
          </div>
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
              label="Income"
              value={monthlyIncomeDisplay}
            />
            <Mini
              label="Ratio"
              value={ratioDisplay}
            />
            <Mini label="Voucher" value={record.housingSupport} />
          </div>
        </Card>
        <Card title="Notes & Activity">
          {record.notes.length === 0 ? (
            <p className="text-sm text-[#475569]">No notes yet.</p>
          ) : (
            record.notes.map((n, i) => (
              <div key={i} className="card-inner px-4 py-3">
                <p className="text-xs font-medium text-[#475569] whitespace-pre-wrap">
                  {n}
                </p>
              </div>
            ))
          )}
        </Card>
      </div>

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
