"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export type ApplicantFormValues = {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  monthlyRent: number;
  monthlyIncome: number;
  creditScore: number;
  rentalHistoryScore: number;
  rulesComplianceScore: number;
  timelineScore: number;
  communicationScore: number;
  documentationScore: number;
  notes: string;
  status: "New" | "Screening" | "Approved" | "Review" | "Rejected";
};

const emptyForm: ApplicantFormValues = {
  name: "",
  email: "",
  phone: "",
  monthlyRent: 1800,
  monthlyIncome: 6000,
  creditScore: 700,
  rentalHistoryScore: 80,
  rulesComplianceScore: 82,
  timelineScore: 84,
  communicationScore: 86,
  documentationScore: 88,
  notes: "",
  status: "New"
};

type ApplicantFormProps = {
  initialApplicant?: ApplicantFormValues | null;
  submitting: boolean;
  onSubmit: (values: ApplicantFormValues) => Promise<boolean>;
  onCancelEdit: () => void;
};

export function ApplicantForm({ initialApplicant, submitting, onSubmit, onCancelEdit }: ApplicantFormProps) {
  const [form, setForm] = useState<ApplicantFormValues>(emptyForm);

  useEffect(() => {
    if (initialApplicant) {
      setForm(initialApplicant);
    } else {
      setForm(emptyForm);
    }
  }, [initialApplicant]);

  const affordabilityRatio = useMemo(
    () => form.monthlyIncome / Math.max(form.monthlyRent, 1),
    [form.monthlyIncome, form.monthlyRent]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const success = await onSubmit(form);

    if (success && !initialApplicant) {
      setForm(emptyForm);
    }
  }

  function update<K extends keyof ApplicantFormValues>(key: K, value: ApplicantFormValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">
            {initialApplicant ? "Edit Applicant" : "New Applicant"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {initialApplicant ? "Update applicant record" : "Create a scoring record"}
          </h2>
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          Affordability {affordabilityRatio.toFixed(1)}x rent
        </div>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Applicant name">
            <input value={form.name} onChange={(event) => update("name", event.target.value)} required />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} required />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(event) => update("status", event.target.value as ApplicantFormValues["status"])}>
              {["New", "Screening", "Approved", "Review", "Rejected"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Monthly rent">
            <input type="number" min="0" value={form.monthlyRent} onChange={(event) => update("monthlyRent", Number(event.target.value))} required />
          </Field>
          <Field label="Monthly income">
            <input type="number" min="0" value={form.monthlyIncome} onChange={(event) => update("monthlyIncome", Number(event.target.value))} required />
          </Field>
          <Field label="Credit score">
            <input type="number" min="300" max="850" value={form.creditScore} onChange={(event) => update("creditScore", Number(event.target.value))} required />
          </Field>
          <Field label="Rental history score">
            <input type="number" min="0" max="100" value={form.rentalHistoryScore} onChange={(event) => update("rentalHistoryScore", Number(event.target.value))} required />
          </Field>
          <Field label="Rules compliance score">
            <input type="number" min="0" max="100" value={form.rulesComplianceScore} onChange={(event) => update("rulesComplianceScore", Number(event.target.value))} required />
          </Field>
          <Field label="Timeline score">
            <input type="number" min="0" max="100" value={form.timelineScore} onChange={(event) => update("timelineScore", Number(event.target.value))} required />
          </Field>
          <Field label="Communication score">
            <input type="number" min="0" max="100" value={form.communicationScore} onChange={(event) => update("communicationScore", Number(event.target.value))} required />
          </Field>
          <Field label="Documentation score">
            <input type="number" min="0" max="100" value={form.documentationScore} onChange={(event) => update("documentationScore", Number(event.target.value))} required />
          </Field>
        </div>

        <label className="grid gap-2 text-sm text-slate-200">
          <span>Notes</span>
          <textarea
            className="min-h-28 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#f7b36d]/60"
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            placeholder="Notes for underwriting, leasing review, or follow-up context."
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : initialApplicant ? "Update applicant" : "Create applicant"}
          </Button>
          {initialApplicant ? (
            <Button type="button" variant="ghost" onClick={onCancelEdit}>
              Cancel edit
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
      <span>{label}</span>
      <div className="[&_input]:w-full [&_input]:rounded-2xl [&_input]:border [&_input]:border-white/10 [&_input]:bg-white/5 [&_input]:px-4 [&_input]:py-3 [&_input]:text-white [&_input]:outline-none [&_input]:transition [&_input]:focus:border-[#f7b36d]/60 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border [&_select]:border-white/10 [&_select]:bg-[#12161e] [&_select]:px-4 [&_select]:py-3 [&_select]:text-white [&_select]:outline-none [&_select]:transition [&_select]:focus:border-[#f7b36d]/60">
        {children}
      </div>
    </label>
  );
}

