"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ExtractedApplicant } from "@/lib/ai-types";
import {
  applicationSourceValues,
  housingSupportValues,
  inspectionStatusValues,
  verificationStatusValues,
} from "@/lib/validators";
import { calculateResponsibleRent } from "@/lib/scoring";
import { isUnsetNumber } from "@/lib/utils";

const lastUsedMonthlyRentKey = "rentninja:last-used-monthly-rent";
const lastUsedTenantPortionRentKey = "rentninja:last-used-tenant-portion-rent";

export type CoApplicantFormValue = {
  name: string;
  email: string;
  phone: string;
  monthlyIncome: number;
  residentScore: number;
  notes: string;
};

export type ApplicantFormValues = {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyPostalCode: string;
  moveInDate: string;
  propertyAddressConfirmed: boolean;
  coApplicants: CoApplicantFormValue[];
  applicationSource: (typeof applicationSourceValues)[number];
  monthlyRent: number;
  monthlyIncome: number;
  housingSupport: (typeof housingSupportValues)[number];
  supportProgram: string;
  monthlySubsidyAmount: number;
  tenantPortionRent: number;
  subsidyStatus: (typeof verificationStatusValues)[number];
  inspectionStatus: (typeof inspectionStatusValues)[number];
  residentScore: number;
  rentalHistoryScore: number;
  rulesComplianceScore: number;
  timelineScore: number;
  communicationScore: number;
  documentationScore: number;
  notes: string;
  status: "New" | "Screening" | "Approved" | "Review" | "Rejected";
};

const emptyCoApplicant: CoApplicantFormValue = {
  name: "",
  email: "",
  phone: "",
  monthlyIncome: 0,
  residentScore: 0,
  notes: "",
};

const emptyForm: ApplicantFormValues = {
  name: "",
  email: "",
  phone: "",
  propertyAddress: "",
  propertyCity: "",
  propertyState: "",
  propertyPostalCode: "",
  moveInDate: "",
  propertyAddressConfirmed: false,
  coApplicants: [],
  applicationSource: "Email / Manual",
  monthlyRent: 0,
  monthlyIncome: 0,
  housingSupport: "None",
  supportProgram: "",
  monthlySubsidyAmount: 0,
  tenantPortionRent: 0,
  subsidyStatus: "N/A",
  inspectionStatus: "N/A",
  residentScore: 0,
  rentalHistoryScore: 0,
  rulesComplianceScore: 0,
  timelineScore: 0,
  communicationScore: 0,
  documentationScore: 0,
  notes: "",
  status: "New",
};

function resetFileInput(input: HTMLInputElement | null) {
  if (input) {
    input.value = "";
  }
}

type ApplicantFormProps = {
  initialApplicant?: ApplicantFormValues | null;
  submitting: boolean;
  onSubmit: (values: ApplicantFormValues) => Promise<boolean>;
  onCancelEdit: () => void;
  defaultPropertyCity?: string;
  defaultPropertyState?: string;
  addressLookupEnabled?: boolean;
};

type AddressSuggestion = {
  id: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  formatted: string;
};

function buildEmptyForm(
  defaultPropertyCity = "",
  defaultPropertyState = "",
): ApplicantFormValues {
  return {
    ...emptyForm,
    propertyCity: defaultPropertyCity,
    propertyState: defaultPropertyState,
  };
}

export function ApplicantForm({
  initialApplicant,
  submitting,
  onSubmit,
  onCancelEdit,
  defaultPropertyCity = "",
  defaultPropertyState = "",
  addressLookupEnabled = false,
}: ApplicantFormProps) {
  const [form, setForm] = useState<ApplicantFormValues>(() =>
    buildEmptyForm(defaultPropertyCity, defaultPropertyState),
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sourceText, setSourceText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [addressPending, setAddressPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addressAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialApplicant) {
      setForm({
        ...initialApplicant,
        propertyAddressConfirmed: Boolean(initialApplicant.propertyAddress),
      });
    } else {
      setForm(buildEmptyForm(defaultPropertyCity, defaultPropertyState));
    }
    setSelectedFiles([]);
    setSourceText("");
    setExtractMessage("");
    setAddressSuggestions([]);
    resetFileInput(fileInputRef.current);
  }, [defaultPropertyCity, defaultPropertyState, initialApplicant]);

  useEffect(() => {
    if (initialApplicant || typeof window === "undefined") {
      return;
    }

    const storedMonthlyRent = window.localStorage.getItem(
      lastUsedMonthlyRentKey,
    );
    const storedTenantPortionRent = window.localStorage.getItem(
      lastUsedTenantPortionRentKey,
    );
    if (!storedMonthlyRent) {
      if (!storedTenantPortionRent) {
        return;
      }
    }

    const parsedMonthlyRent = Number(storedMonthlyRent);
    const parsedTenantPortionRent = Number(storedTenantPortionRent);

    setForm((current) => ({
      ...current,
      monthlyRent:
        current.monthlyRent > 0 ||
        !Number.isFinite(parsedMonthlyRent) ||
        parsedMonthlyRent <= 0
          ? current.monthlyRent
          : parsedMonthlyRent,
      tenantPortionRent:
        current.tenantPortionRent > 0 ||
        !Number.isFinite(parsedTenantPortionRent) ||
        parsedTenantPortionRent <= 0
          ? current.tenantPortionRent
          : parsedTenantPortionRent,
    }));
  }, [initialApplicant]);

  const responsibleRent = useMemo(() => calculateResponsibleRent(form), [form]);

  const affordabilityRatio = useMemo(
    () => (responsibleRent > 0 ? form.monthlyIncome / responsibleRent : 0),
    [form.monthlyIncome, responsibleRent],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      addressLookupEnabled &&
      form.propertyAddress.trim() &&
      !form.propertyAddressConfirmed
    ) {
      setExtractMessage(
        "Choose a real address suggestion before saving so the property is standardized correctly.",
      );
      return;
    }

    const success = await onSubmit(form);

    if (success && !initialApplicant) {
      if (typeof window !== "undefined" && form.monthlyRent > 0) {
        window.localStorage.setItem(
          lastUsedMonthlyRentKey,
          String(form.monthlyRent),
        );
      }
      if (typeof window !== "undefined" && form.tenantPortionRent > 0) {
        window.localStorage.setItem(
          lastUsedTenantPortionRentKey,
          String(form.tenantPortionRent),
        );
      }
      setForm(buildEmptyForm(defaultPropertyCity, defaultPropertyState));
      setSelectedFiles([]);
      setSourceText("");
      setExtractMessage("");
      setAddressSuggestions([]);
      setAddressPending(false);
      addressAbortRef.current?.abort();
      resetFileInput(fileInputRef.current);
    }
  }

  function update<K extends keyof ApplicantFormValues>(
    key: K,
    value: ApplicantFormValues[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyAddressSuggestion(suggestion: AddressSuggestion) {
    setForm((current) => ({
      ...current,
      propertyAddress: suggestion.formatted,
      propertyCity: suggestion.city || current.propertyCity,
      propertyState: suggestion.state || current.propertyState,
      propertyPostalCode: suggestion.postalCode || current.propertyPostalCode,
      propertyAddressConfirmed: true,
    }));
    setAddressSuggestions([]);
  }

  function updateCoApplicant(
    index: number,
    key: keyof CoApplicantFormValue,
    value: CoApplicantFormValue[keyof CoApplicantFormValue],
  ) {
    setForm((current) => ({
      ...current,
      coApplicants: current.coApplicants.map((coApplicant, coApplicantIndex) =>
        coApplicantIndex === index
          ? { ...coApplicant, [key]: value }
          : coApplicant,
      ),
    }));
  }

  function addCoApplicant() {
    setForm((current) => ({
      ...current,
      coApplicants: [...current.coApplicants, { ...emptyCoApplicant }],
    }));
  }

  function removeCoApplicant(index: number) {
    setForm((current) => ({
      ...current,
      coApplicants: current.coApplicants.filter(
        (_, coApplicantIndex) => coApplicantIndex !== index,
      ),
    }));
  }

  function handleNumberInput<K extends keyof ApplicantFormValues>(
    key: K,
    rawValue: string,
  ) {
    if (rawValue === "") {
      update(key, 0 as ApplicantFormValues[K]);
      return;
    }

    update(key, Number(rawValue) as ApplicantFormValues[K]);
  }

  async function extractFromApplication() {
    if (selectedFiles.length === 0 && !sourceText.trim()) {
      setExtractMessage(
        "Choose one or more files, or paste application text first.",
      );
      return;
    }

    setExtracting(true);
    setExtractMessage("");

    try {
      const payload = new FormData();
      selectedFiles.forEach((file) => payload.append("files", file));
      if (sourceText.trim()) {
        payload.append("sourceText", sourceText.trim());
      }

      const response = await fetch("/api/ai/extract-application", {
        method: "POST",
        body: payload,
      });
      const data = (await response.json()) as ExtractedApplicant & {
        message?: string;
      };

      if (!response.ok) {
        setExtractMessage(data.message || "Unable to extract applicant data.");
        return;
      }

      setForm((current) => ({
        ...current,
        name: data.name || current.name,
        email: data.email || current.email,
        phone: data.phone || current.phone,
        propertyAddress: data.propertyAddress || current.propertyAddress,
        propertyCity: current.propertyCity,
        propertyState: current.propertyState,
        propertyPostalCode:
          data.propertyPostalCode || current.propertyPostalCode,
        moveInDate: data.moveInDate || current.moveInDate,
        propertyAddressConfirmed: data.propertyAddress
          ? false
          : current.propertyAddressConfirmed,
        coApplicants:
          data.coApplicants.length > 0
            ? data.coApplicants
            : current.coApplicants,
        applicationSource: data.applicationSource || current.applicationSource,
        monthlyRent:
          data.monthlyRent > 0 ? data.monthlyRent : current.monthlyRent,
        monthlyIncome:
          data.monthlyIncome >= 0 ? data.monthlyIncome : current.monthlyIncome,
        housingSupport: data.housingSupport || current.housingSupport,
        supportProgram: data.supportProgram || current.supportProgram,
        monthlySubsidyAmount:
          data.monthlySubsidyAmount >= 0
            ? data.monthlySubsidyAmount
            : current.monthlySubsidyAmount,
        tenantPortionRent:
          data.tenantPortionRent >= 0
            ? data.tenantPortionRent
            : current.tenantPortionRent,
        subsidyStatus: data.subsidyStatus || current.subsidyStatus,
        inspectionStatus: data.inspectionStatus || current.inspectionStatus,
        residentScore:
          data.residentScore >= 0 ? data.residentScore : current.residentScore,
        rentalHistoryScore:
          data.rentalHistoryScore >= 0
            ? data.rentalHistoryScore
            : current.rentalHistoryScore,
        rulesComplianceScore:
          data.rulesComplianceScore >= 0
            ? data.rulesComplianceScore
            : current.rulesComplianceScore,
        timelineScore:
          data.timelineScore >= 0 ? data.timelineScore : current.timelineScore,
        communicationScore:
          data.communicationScore >= 0
            ? data.communicationScore
            : current.communicationScore,
        documentationScore:
          data.documentationScore >= 0
            ? data.documentationScore
            : current.documentationScore,
        status: data.status || current.status,
        notes: [
          data.extractionSummary ? `Summary\n${data.extractionSummary}` : "",
          data.notes.length > 0
            ? `Extracted details\n${data.notes.join("\n")}`
            : "",
          data.missingItems.length > 0
            ? `Missing items\n${data.missingItems.join("\n")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      }));

      setExtractMessage(
        "Application extracted. Review the fields, then save the applicant.",
      );
    } finally {
      setExtracting(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const query = form.propertyAddress.trim();
    if (
      !addressLookupEnabled ||
      form.propertyAddressConfirmed ||
      query.length < 4
    ) {
      addressAbortRef.current?.abort();
      setAddressSuggestions([]);
      setAddressPending(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      addressAbortRef.current?.abort();
      const controller = new AbortController();
      addressAbortRef.current = controller;
      setAddressPending(true);

      try {
        const params = new URLSearchParams({ q: query });

        const response = await fetch(
          `/api/address/search?${params.toString()}`,
          {
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as {
          suggestions?: AddressSuggestion[];
        };

        if (!response.ok) {
          setAddressSuggestions([]);
          return;
        }

        setAddressSuggestions(data.suggestions || []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setAddressSuggestions([]);
        }
      } finally {
        if (addressAbortRef.current === controller) {
          setAddressPending(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [
    addressLookupEnabled,
    form.propertyAddress,
    form.propertyAddressConfirmed,
  ]);

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">
            {initialApplicant ? "Edit Applicant" : "New Applicant"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {initialApplicant
              ? "Update applicant record"
              : "Create a scoring record"}
          </h2>
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          {isUnsetNumber(form.monthlyRent) || isUnsetNumber(form.monthlyIncome)
            ? "Affordability pending rent + income"
            : form.housingSupport === "None"
              ? `Affordability ${affordabilityRatio.toFixed(1)}x rent`
              : `Affordability ${affordabilityRatio.toFixed(1)}x tenant share`}
        </div>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="rounded-[28px] border border-dashed border-[#f7b36d]/25 bg-[linear-gradient(180deg,rgba(247,179,109,0.08),rgba(255,255,255,0.02))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">
                AI Intake Assistant
              </p>
              <p className="text-lg font-semibold text-white">
                Import a full applicant packet in one step
              </p>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                Upload one or more rental application files, screenshots, or
                supporting documents from any source, or paste application text,
                and let OpenAI prefill the applicant record for review. Property
                addresses can be typed partially and then confirmed from real
                address suggestions.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                className="max-w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:font-semibold file:text-white"
                onChange={(event) =>
                  setSelectedFiles(Array.from(event.target.files ?? []))
                }
              />
              <Button
                type="button"
                variant="secondary"
                onClick={extractFromApplication}
                disabled={extracting}
              >
                {extracting ? "Reading packet..." : "Extract packet with AI"}
              </Button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              "Upload multiple PDFs or screenshots together",
              "Paste copied application text or email summaries",
              "Review the extracted fields before saving",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
          {selectedFiles.length > 0 ? (
            <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                {selectedFiles.length} file
                {selectedFiles.length === 1 ? "" : "s"} ready for extraction
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedFiles.map((file) => (
                  <span
                    key={`${file.name}-${file.size}`}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-100"
                  >
                    {file.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <label className="mt-4 grid gap-2 text-sm text-slate-200">
            <span>Paste application text or email summary</span>
            <textarea
              className="min-h-28 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-[#f7b36d]/60"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Paste application details from Apartments.com, Zillow, TurboTenant, RentSpree, Avail, email summaries, or copied renter information here."
            />
          </label>
          {extractMessage ? (
            <p className="mt-3 text-sm text-amber-100">{extractMessage}</p>
          ) : null}
        </div>

        <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#f7b36d]">
            Optional screening inputs
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">
            Leave source scores blank when they do not exist
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Do not guess a ResidentScore, screening score, or review score just
            to fill the form. If a source like Apartments.com or a screening
            provider does not supply the value, leave it blank and RentNinja AI
            will ignore that metric instead of treating it like a zero.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Applicant name">
            <input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              required
            />
          </Field>
          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
              required
            />
          </Field>
          <Field label="Property address">
            <div className="relative">
              <input
                name="property-address-search"
                value={form.propertyAddress}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    propertyAddress: event.target.value,
                    propertyCity: current.propertyAddressConfirmed
                      ? ""
                      : current.propertyCity,
                    propertyState: current.propertyAddressConfirmed
                      ? ""
                      : current.propertyState,
                    propertyPostalCode: current.propertyAddressConfirmed
                      ? ""
                      : current.propertyPostalCode,
                    propertyAddressConfirmed: false,
                  }))
                }
                placeholder="Type part of an address, like 1925 Ryder"
                autoComplete="new-password"
                data-form-type="other"
                data-lpignore="true"
                data-1p-ignore="true"
                spellCheck={false}
              />
              {addressPending ? (
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  Finding
                </span>
              ) : null}
              {addressSuggestions.length > 0 ? (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-[18px] border border-white/10 bg-[#11161e] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
                  {addressSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="block w-full border-b border-white/8 px-4 py-3 text-left transition hover:bg-white/8 last:border-b-0"
                      onClick={() => applyAddressSuggestion(suggestion)}
                    >
                      <span className="block text-sm font-semibold text-white">
                        {suggestion.formatted}
                      </span>
                      <span className="mt-1 block text-xs text-slate-300">
                        {[
                          suggestion.city,
                          suggestion.state,
                          suggestion.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {!addressLookupEnabled ? (
                <p className="mt-2 text-xs text-slate-400">
                  Real address lookup is unavailable until{" "}
                  <code>MAPBOX_ACCESS_TOKEN</code> is configured. Manual entry
                  will still save.
                </p>
              ) : form.propertyAddress && !form.propertyAddressConfirmed ? (
                <p className="mt-2 text-xs text-amber-100">
                  Choose one of the real address suggestions to confirm the
                  property address.
                </p>
              ) : form.propertyAddressConfirmed ? (
                <p className="mt-2 text-xs text-emerald-100">
                  Real address confirmed and standardized.
                </p>
              ) : null}
            </div>
          </Field>
          <Field label="Move-in date">
            <input
              type="date"
              value={form.moveInDate}
              onChange={(event) => update("moveInDate", event.target.value)}
            />
          </Field>
          <Field label="Application source">
            <select
              value={form.applicationSource}
              onChange={(event) =>
                update(
                  "applicationSource",
                  event.target
                    .value as ApplicantFormValues["applicationSource"],
                )
              }
            >
              {applicationSourceValues.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                update(
                  "status",
                  event.target.value as ApplicantFormValues["status"],
                )
              }
            >
              {["New", "Screening", "Approved", "Review", "Rejected"].map(
                (item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="Monthly rent">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monthlyRent === 0 ? "" : form.monthlyRent}
              onChange={(event) =>
                handleNumberInput("monthlyRent", event.target.value)
              }
              required
            />
          </Field>
          <Field label="Combined household income">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monthlyIncome === 0 ? "" : form.monthlyIncome}
              onChange={(event) =>
                handleNumberInput("monthlyIncome", event.target.value)
              }
              required
            />
          </Field>
          <Field label="Housing assistance">
            <select
              value={form.housingSupport}
              onChange={(event) =>
                update(
                  "housingSupport",
                  event.target.value as ApplicantFormValues["housingSupport"],
                )
              }
            >
              {housingSupportValues.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Program name">
            <input
              value={form.supportProgram}
              onChange={(event) => update("supportProgram", event.target.value)}
              placeholder="Housing Choice Voucher, local subsidy, etc."
            />
          </Field>
          <Field label="Monthly subsidy amount">
            <input
              type="number"
              min="0"
              step="0.01"
              value={
                form.monthlySubsidyAmount === 0 ? "" : form.monthlySubsidyAmount
              }
              onChange={(event) =>
                handleNumberInput("monthlySubsidyAmount", event.target.value)
              }
            />
          </Field>
          <Field label="Tenant portion rent">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tenantPortionRent === 0 ? "" : form.tenantPortionRent}
              onChange={(event) =>
                handleNumberInput("tenantPortionRent", event.target.value)
              }
            />
          </Field>
          <Field label="Assistance verification">
            <select
              value={form.subsidyStatus}
              onChange={(event) =>
                update(
                  "subsidyStatus",
                  event.target.value as ApplicantFormValues["subsidyStatus"],
                )
              }
            >
              {verificationStatusValues.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Inspection status">
            <select
              value={form.inspectionStatus}
              onChange={(event) =>
                update(
                  "inspectionStatus",
                  event.target.value as ApplicantFormValues["inspectionStatus"],
                )
              }
            >
              {inspectionStatusValues.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ResidentScore or source screening score">
            <input
              type="number"
              min="0"
              max="850"
              value={form.residentScore === 0 ? "" : form.residentScore}
              onChange={(event) =>
                handleNumberInput("residentScore", event.target.value)
              }
            />
          </Field>
          <Field label="Rental history score (optional)">
            <input
              type="number"
              min="0"
              max="100"
              value={
                form.rentalHistoryScore === 0 ? "" : form.rentalHistoryScore
              }
              onChange={(event) =>
                handleNumberInput("rentalHistoryScore", event.target.value)
              }
            />
          </Field>
          <Field label="Rules compliance score (optional)">
            <input
              type="number"
              min="0"
              max="100"
              value={
                form.rulesComplianceScore === 0 ? "" : form.rulesComplianceScore
              }
              onChange={(event) =>
                handleNumberInput("rulesComplianceScore", event.target.value)
              }
            />
          </Field>
          <Field label="Timeline score (optional)">
            <input
              type="number"
              min="0"
              max="100"
              value={form.timelineScore === 0 ? "" : form.timelineScore}
              onChange={(event) =>
                handleNumberInput("timelineScore", event.target.value)
              }
            />
          </Field>
          <Field label="Communication score (optional)">
            <input
              type="number"
              min="0"
              max="100"
              value={
                form.communicationScore === 0 ? "" : form.communicationScore
              }
              onChange={(event) =>
                handleNumberInput("communicationScore", event.target.value)
              }
            />
          </Field>
          <Field label="Documentation score (optional)">
            <input
              type="number"
              min="0"
              max="100"
              value={
                form.documentationScore === 0 ? "" : form.documentationScore
              }
              onChange={(event) =>
                handleNumberInput("documentationScore", event.target.value)
              }
            />
          </Field>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#f7b36d]">
                Household members
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Joint application support
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                Add every adult applying for the same unit. The combined
                household income above should include the primary applicant plus
                all co-applicants.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={addCoApplicant}>
              Add co-applicant
            </Button>
          </div>

          {form.coApplicants.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {form.coApplicants.map((coApplicant, index) => (
                <div
                  key={`${coApplicant.email}-${index}`}
                  className="rounded-[22px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-300">
                        Co-applicant {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Use this for the second adult on the same lease
                        application.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeCoApplicant(index)}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Full name">
                      <input
                        value={coApplicant.name}
                        onChange={(event) =>
                          updateCoApplicant(index, "name", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Email">
                      <input
                        type="email"
                        value={coApplicant.email}
                        onChange={(event) =>
                          updateCoApplicant(index, "email", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Phone">
                      <input
                        value={coApplicant.phone}
                        onChange={(event) =>
                          updateCoApplicant(index, "phone", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Monthly income">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          coApplicant.monthlyIncome === 0
                            ? ""
                            : coApplicant.monthlyIncome
                        }
                        onChange={(event) =>
                          updateCoApplicant(
                            index,
                            "monthlyIncome",
                            event.target.value === ""
                              ? 0
                              : Number(event.target.value),
                          )
                        }
                      />
                    </Field>
                    <Field label="ResidentScore">
                      <input
                        type="number"
                        min="0"
                        max="850"
                        value={
                          coApplicant.residentScore === 0
                            ? ""
                            : coApplicant.residentScore
                        }
                        onChange={(event) =>
                          updateCoApplicant(
                            index,
                            "residentScore",
                            event.target.value === ""
                              ? 0
                              : Number(event.target.value),
                          )
                        }
                      />
                    </Field>
                  </div>

                  <label className="mt-4 grid gap-2 text-sm text-slate-200">
                    <span>Co-applicant notes</span>
                    <textarea
                      className="min-h-20 rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-[#f7b36d]/60"
                      value={coApplicant.notes}
                      onChange={(event) =>
                        updateCoApplicant(index, "notes", event.target.value)
                      }
                      placeholder="Employment, documents reviewed, or anything unique about this co-applicant."
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] border border-dashed border-white/10 bg-white/4 px-4 py-4 text-sm text-slate-300">
              No co-applicants added yet. This application will be treated as a
              single applicant unless you add another adult here.
            </div>
          )}
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
            {submitting
              ? "Saving..."
              : initialApplicant
                ? "Update applicant"
                : "Create applicant"}
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
      <span>{label}</span>
      <div className="[&_input]:w-full [&_input]:rounded-2xl [&_input]:border [&_input]:border-white/10 [&_input]:bg-white/5 [&_input]:px-4 [&_input]:py-3 [&_input]:text-base [&_input]:text-white [&_input]:outline-none [&_input]:transition [&_input]:focus:border-[#f7b36d]/60 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border [&_select]:border-white/10 [&_select]:bg-[#12161e] [&_select]:px-4 [&_select]:py-3 [&_select]:text-base [&_select]:text-white [&_select]:outline-none [&_select]:transition [&_select]:focus:border-[#f7b36d]/60 [&_textarea]:rounded-2xl [&_textarea]:border [&_textarea]:border-white/10 [&_textarea]:bg-white/5 [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-base [&_textarea]:text-white [&_textarea]:outline-none [&_textarea]:transition [&_textarea]:focus:border-[#f7b36d]/60">
        {children}
      </div>
    </label>
  );
}
