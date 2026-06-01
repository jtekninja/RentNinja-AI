"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { sanitizeApplicantPayload } from "@/lib/sanitize-applicant-payload";
import {
  applicantStatusValues,
  normalizeApplicantStatus,
  type ApplicantStatus,
} from "@/lib/applicant-status";
import {
  extractMoveInCosts,
  formatDueAtSigningBreakdown,
} from "@/lib/move-in-costs";

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
  rentWarning?: string | null;
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

type UploadedFileMetadata = {
  filename: string;
  type: string;
  size: number;
  uploadedAt: string;
  extractionStatus: string;
};

type AddressSuggestion = {
  id: string;
  formatted: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
};

type SavedProperty = {
  _id: string;
  name: string;
  address: string;
  monthlyRent: number;
  securityDepositMonths?: number;
  requireFirstMonthAtSigning?: boolean;
  utilitiesIncluded: boolean;
  unitCount?: number;
  propertyType?: string;
};

type PropertyForm = {
  propertyId: string;
  propertyAddress: string;
  propertyUnit: string;
  borough: string;
  neighborhood: string;
  bedrooms: string;
  bathrooms: string;
  monthlyRent: string;
  securityDepositMonths: string;
  requireFirstMonthAtSigning: boolean;
  utilitiesIncluded: boolean;
  propertyNickname: string;
  propertyCity: string;
  propertyState: string;
  propertyPostalCode: string;
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

function formatMoveInMoney(value: number | null | undefined) {
  return value && value > 0 ? `$${Math.round(value).toLocaleString()}` : "";
}

function normalizeProofOfFundsDocs(items: string[], dueAtSigningAmount: number | null) {
  const proofDoc = dueAtSigningAmount
    ? `Proof of funds for ${formatMoveInMoney(dueAtSigningAmount)} due at signing`
    : "Proof of funds for move-in costs";
  const hasProofRequest = items.some((item) =>
    /proof of funds|move[- ]?in costs?|due at signing/i.test(item),
  );
  const cleaned = items.filter(
    (item) => !/proof of funds|move[- ]?in costs?|due at signing/i.test(item),
  );

  return hasProofRequest ? [...cleaned, proofDoc] : items;
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
    rentWarning: data.rentWarning ?? null,
  };
}

function emptyPropertyForm(): PropertyForm {
  return {
    propertyId: "",
    propertyAddress: "",
    propertyUnit: "",
    borough: "",
    neighborhood: "",
    bedrooms: "",
    bathrooms: "",
    monthlyRent: "",
    securityDepositMonths: "1",
    requireFirstMonthAtSigning: true,
    utilitiesIncluded: false,
    propertyNickname: "",
    propertyCity: "",
    propertyState: "",
    propertyPostalCode: "",
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileStatus, setFileStatus] = useState("");
  const [lastReviewInput, setLastReviewInput] = useState("");
  const [lastDocumentExtractText, setLastDocumentExtractText] = useState("");
  const [selectedSaveStatus, setSelectedSaveStatus] = useState<ApplicantStatus>("New");
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [propertyForm, setPropertyForm] = useState<PropertyForm>(() => emptyPropertyForm());
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressPending, setAddressPending] = useState(false);
  const [addressLookupAvailable, setAddressLookupAvailable] = useState(true);

  function resetSavedState() {
    setSavedId(null);
    setSavedApplicantId(null);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/properties", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setSavedProperties(data);
        }
      })
      .catch(() => {
        if (active) setSavedProperties([]);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = propertyForm.propertyAddress.trim();
    if (query.length < 4) {
      setAddressSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAddressPending(true);
      try {
        const response = await fetch(
          `/api/address/search?${new URLSearchParams({ q: query }).toString()}`,
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => ({}));
        const suggestions = Array.isArray(data.suggestions)
          ? data.suggestions
          : [];
        setAddressSuggestions(suggestions);
        setAddressLookupAvailable(suggestions.length > 0 || response.ok);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setAddressSuggestions([]);
          setAddressLookupAvailable(false);
        }
      } finally {
        setAddressPending(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [propertyForm.propertyAddress]);

  function extractionToReviewText(data: Record<string, unknown>) {
    const lines = [
      "Extracted applicant packet details:",
      data.name ? `Applicant name: ${data.name}` : "",
      data.phone ? `Phone: ${data.phone}` : "",
      data.email ? `Email: ${data.email}` : "",
      data.moveInDate ? `Move-in date: ${data.moveInDate}` : "",
      data.propertyAddress ? `Property: ${data.propertyAddress}` : "",
      finiteNumber(data.monthlyRent) ? `Monthly rent: $${Number(data.monthlyRent).toLocaleString()}/month` : "",
      finiteNumber(data.monthlyIncome) ? `Household income: $${Number(data.monthlyIncome).toLocaleString()}/month` : "",
      data.housingSupport && data.housingSupport !== "None"
        ? `Voucher/subsidy: ${data.housingSupport}`
        : "",
      data.supportProgram ? `Support program: ${data.supportProgram}` : "",
      finiteNumber(data.tenantPortionRent)
        ? `Tenant portion: $${Number(data.tenantPortionRent).toLocaleString()}`
        : "",
      Array.isArray(data.notes) && data.notes.length
        ? `Notes:\n${data.notes.join("\n")}`
        : "",
      Array.isArray(data.missingItems) && data.missingItems.length
        ? `Missing items:\n${data.missingItems.join("\n")}`
        : "",
      data.extractionSummary ? `Extraction summary: ${data.extractionSummary}` : "",
    ].filter(Boolean);

    return lines.join("\n");
  }

  async function extractFilesForReview(sourceText: string) {
    if (selectedFiles.length === 0) {
      setLastDocumentExtractText("");
      return "";
    }

    setFileStatus(`Reading ${selectedFiles.length} uploaded file${selectedFiles.length === 1 ? "" : "s"}...`);

    const textFiles = selectedFiles.filter(
      (file) => file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt"),
    );
    const remoteFiles = selectedFiles.filter((file) =>
      ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type),
    );
    const unsupportedFiles = selectedFiles.filter(
      (file) => !textFiles.includes(file) && !remoteFiles.includes(file),
    );

    if (unsupportedFiles.length > 0) {
      setFileStatus(
        `File attached, but text could not be extracted. RentNinja can read PDF, PNG, JPG, WEBP, and TXT files right now.`,
      );
    }

    const textFileParts = await Promise.all(
      textFiles.map(async (file) => {
        const text = await file.text();
        return `[Text file: ${file.name}]\n${text.trim()}`;
      }),
    );

    if (remoteFiles.length === 0) {
      const textOnlyExtract = textFileParts.filter(Boolean).join("\n\n");
      setFileStatus(
        textOnlyExtract
          ? `Read ${textFiles.length} text file${textFiles.length === 1 ? "" : "s"}.`
          : "File attached, but text could not be extracted.",
      );
      setLastDocumentExtractText(textOnlyExtract);
      return textOnlyExtract;
    }

    const formData = new FormData();
    remoteFiles.forEach((file) => formData.append("files", file));
    const sourceForExtraction = [sourceText.trim(), ...textFileParts]
      .filter(Boolean)
      .join("\n\n");
    if (sourceForExtraction) {
      formData.append("sourceText", sourceForExtraction);
    }

    const response = await fetch("/api/ai/extract-application", {
      method: "POST",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("File extraction failed", {
        status: response.status,
        response: data,
        files: selectedFiles.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        })),
      });
      const readableText = textFileParts.filter(Boolean).join("\n\n");
      setLastDocumentExtractText(readableText);
      setFileStatus("File attached, but text could not be extracted.");
      return readableText;
    }

    const extractedText = extractionToReviewText(data);
    const combinedText = [...textFileParts, extractedText].filter(Boolean).join("\n\n");
    setLastDocumentExtractText(combinedText);
    setFileStatus(
      combinedText
        ? `Read ${selectedFiles.length} uploaded file${selectedFiles.length === 1 ? "" : "s"}.`
        : "Files were uploaded, but no readable applicant details were found.",
    );
    return combinedText;
  }

  function updatePropertyForm<K extends keyof PropertyForm>(
    key: K,
    value: PropertyForm[K],
  ) {
    setPropertyForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "propertyAddress" ? { propertyId: "" } : {}),
    }));
    resetSavedState();
  }

  function applyAddressSuggestion(suggestion: AddressSuggestion) {
    setPropertyForm((current) => ({
      ...current,
      propertyId: "",
      propertyAddress: suggestion.formatted || suggestion.address,
      propertyCity: suggestion.city || current.propertyCity,
      propertyState: suggestion.state || current.propertyState,
      propertyPostalCode: suggestion.postalCode || current.propertyPostalCode,
    }));
    setAddressSuggestions([]);
    resetSavedState();
  }

  function chooseSavedProperty(propertyId: string) {
    const property = savedProperties.find((item) => item._id === propertyId);
    if (!property) {
      setPropertyForm((current) => ({ ...current, propertyId }));
      return;
    }

    setPropertyForm((current) => ({
      ...current,
      propertyId: property._id,
      propertyAddress: property.address,
      monthlyRent: property.monthlyRent ? String(property.monthlyRent) : "",
      securityDepositMonths: String(property.securityDepositMonths ?? 1),
      requireFirstMonthAtSigning: property.requireFirstMonthAtSigning !== false,
      utilitiesIncluded: property.utilitiesIncluded,
      propertyNickname: property.name,
    }));
    setAddressSuggestions([]);
    resetSavedState();
  }

  function buildPropertyContext() {
    const propertyRent = finiteNumber(propertyForm.monthlyRent);
    return {
      propertyId: propertyForm.propertyId,
      propertyAddress: propertyForm.propertyAddress.trim(),
      propertyUnit: propertyForm.propertyUnit.trim(),
      borough: propertyForm.borough.trim(),
      neighborhood: propertyForm.neighborhood.trim(),
      bedrooms: finiteNumber(propertyForm.bedrooms),
      bathrooms: finiteNumber(propertyForm.bathrooms),
      monthlyRent: propertyRent && propertyRent > 0 ? propertyRent : null,
      securityDepositMonths: finiteNumber(propertyForm.securityDepositMonths) ?? 1,
      requireFirstMonthAtSigning: propertyForm.requireFirstMonthAtSigning,
      utilitiesIncluded: propertyForm.utilitiesIncluded,
      propertyNickname: propertyForm.propertyNickname.trim(),
      propertyCity: propertyForm.propertyCity,
      propertyState: propertyForm.propertyState,
      propertyPostalCode: propertyForm.propertyPostalCode,
    };
  }

  function propertyContextToReviewText() {
    const context = buildPropertyContext();
    if (!context.propertyAddress && !context.monthlyRent) {
      return "No property selected — rent and location-specific screening may be incomplete.";
    }

    return [
      "Selected rental property context:",
      context.propertyNickname ? `Nickname: ${context.propertyNickname}` : "",
      context.propertyAddress ? `Property address: ${context.propertyAddress}` : "",
      context.propertyUnit ? `Unit: ${context.propertyUnit}` : "",
      context.borough ? `Borough / neighborhood: ${context.borough}` : "",
      context.neighborhood ? `Neighborhood: ${context.neighborhood}` : "",
      context.bedrooms ? `Bedrooms: ${context.bedrooms}` : "",
      context.bathrooms ? `Bathrooms: ${context.bathrooms}` : "",
      context.monthlyRent
        ? `Monthly asking rent: $${context.monthlyRent.toLocaleString()}/month`
        : "",
      `Security deposit months: ${context.securityDepositMonths ?? 1}`,
      `First month due at signing: ${context.requireFirstMonthAtSigning !== false ? "yes" : "no"}`,
      context.utilitiesIncluded ? "Utilities included: yes" : "Utilities included: no",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function buildUploadedFileMetadata(extractionStatus: string): UploadedFileMetadata[] {
    const uploadedAt = new Date().toISOString();
    return selectedFiles.map((file) => ({
      filename: file.name,
      type: file.type || "unknown",
      size: file.size,
      uploadedAt,
      extractionStatus,
    }));
  }

  async function runDecision() {
    setPending(true);
    setError("");
    setSaveError("");
    resetSavedState();

    try {
      const extractedFileText = await extractFilesForReview(input);
      const reviewInput = [
        propertyContextToReviewText(),
        input.trim() ? `Pasted applicant info:\n${input.trim()}` : "",
        extractedFileText,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (!reviewInput.trim()) {
        setError(
          selectedFiles.length > 0
            ? "File attached, but text could not be extracted. Paste the key applicant details and run the review again."
            : "Paste applicant info or upload at least one file first.",
        );
        return;
      }

      setLastReviewInput(reviewInput);
      const response = await fetch("/api/ai/one-minute-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: reviewInput,
          propertyContext: buildPropertyContext(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to run applicant decision.");
        return;
      }

      const normalizedResult = normalizeDecisionResult(data);
      const propertyRent = buildPropertyContext().monthlyRent;
      const pastedRent = parseRentToMonthly(input);
      const rentWarning =
        propertyRent && pastedRent && Math.abs(propertyRent - pastedRent) >= 1
          ? "Pasted rent differs from saved property rent."
          : null;
      const finalRent =
        propertyRent ??
        (normalizedResult.monthlyRentAmount > 0
          ? normalizedResult.monthlyRentAmount
          : 0);
      const finalResult =
        finalRent > 0 && finalRent !== normalizedResult.monthlyRentAmount
          ? {
              ...normalizedResult,
              monthlyRentAmount: finalRent,
              monthlyRent: formatRentDisplay(finalRent),
              affordabilityDisplay: formatAffordabilityDisplay(
                normalizedResult.normalizedMonthlyIncome,
                finalRent,
              ),
              rentWarning,
            }
          : { ...normalizedResult, rentWarning };
      setResult(finalResult);
      setSelectedSaveStatus(normalizeApplicantStatus(finalResult.suggestedStatus));
    } catch (err) {
      console.error("1-Minute Review failed", err);
      if (selectedFiles.length > 0) {
        setFileStatus("File attached, but text could not be extracted.");
      }
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
    const importantNotes = [
      currentResult.bestNextStep ? `Next step: ${currentResult.bestNextStep}` : "",
      currentResult.suggestedStatus
        ? `AI recommended status: ${currentResult.suggestedStatus}`
        : "",
      selectedSaveStatus ? `Saved status: ${selectedSaveStatus}` : "",
      currentResult.mainConcern ? `Main concern: ${currentResult.mainConcern}` : "",
      currentResult.mainStrength ? `Strength: ${currentResult.mainStrength}` : "",
      currentResult.missingDocuments.length
        ? `Missing documents: ${currentResult.missingDocuments.join(", ")}`
        : "",
    ].filter(Boolean);
    const sourceMaterial = lastReviewInput || input;
    const uploadedFiles = buildUploadedFileMetadata(
      selectedFiles.length === 0
        ? "not_attached"
        : lastDocumentExtractText
          ? "extracted"
          : "File attached, but text could not be extracted.",
    );
    const propertyContext = buildPropertyContext();
    const propertyAddressNote = propertyContext.propertyAddress
      ? `Property: ${propertyContext.propertyAddress}${propertyContext.propertyUnit ? `, ${propertyContext.propertyUnit}` : ""}`
      : "No property selected — rent and location-specific screening may be incomplete.";

    const moveInCosts = extractMoveInCosts(
      [
        sourceMaterial,
        lastDocumentExtractText,
        currentResult.confidenceReason,
        currentResult.missingDocuments.join("\n"),
      ].join("\n"),
      monthlyRent || propertyContext.monthlyRent || null,
    );
    const securityDepositMonths = propertyContext.securityDepositMonths ?? 1;
    const firstMonthRent =
      moveInCosts.firstMonthRent ??
      (propertyContext.requireFirstMonthAtSigning !== false && monthlyRent ? monthlyRent : null);
    const securityDeposit =
      moveInCosts.securityDeposit ??
      (monthlyRent && securityDepositMonths ? monthlyRent * securityDepositMonths : null);
    const dueAtSigningAmount =
      moveInCosts.dueAtSigningAmount ??
      (monthlyRent && (firstMonthRent || securityDeposit)
        ? (firstMonthRent ?? 0) + (securityDeposit ?? 0)
        : null);
    const normalizedMissingDocuments = normalizeProofOfFundsDocs(
      currentResult.missingDocuments,
      dueAtSigningAmount,
    );
    const dueAtSigningBreakdown = formatDueAtSigningBreakdown({
      ...moveInCosts,
      firstMonthRent,
      securityDeposit,
    });

    return sanitizeApplicantPayload({
      name: applicantName,
      email:
        currentResult.email && currentResult.email.includes("@")
          ? truncateForField(currentResult.email, 150)
          : `unknown-${Date.now()}@rentninja.local`,
      phone: truncateForField(currentResult.phone || "000-000-0000", 50),
      propertyId: propertyContext.propertyId,
      propertyAddress: propertyContext.propertyAddress,
      propertyUnit: propertyContext.propertyUnit,
      propertyNickname: propertyContext.propertyNickname,
      borough: propertyContext.borough,
      neighborhood: propertyContext.neighborhood,
      bedrooms: propertyContext.bedrooms,
      bathrooms: propertyContext.bathrooms,
      utilitiesIncluded: propertyContext.utilitiesIncluded,
      propertyCity: propertyContext.propertyCity,
      propertyState: propertyContext.propertyState,
      propertyPostalCode: propertyContext.propertyPostalCode,
      moveInDate: truncateForField(currentResult.moveInDate, 150),
      coApplicants: [],
      monthlyRent,
      propertyMonthlyRent: propertyContext.monthlyRent ?? monthlyRent,
      rentSource: propertyContext.monthlyRent ? "Property rent" : monthlyRent ? "Applicant message/document" : "Needs confirmation",
      incomeSource: normalizedMonthlyIncome ? "Applicant message/document" : "Needs confirmation",
      dueAtSigningSource: moveInCosts.dueAtSigningAmount ? "Applicant message/document" : dueAtSigningAmount ? "Calculated from rent + security" : "Needs confirmation",
      securityDepositMonths,
      requireFirstMonthAtSigning: propertyContext.requireFirstMonthAtSigning !== false,
      financialFieldsCorrected: false,
      financialCorrectionNote: "",
      monthlyIncome: normalizedMonthlyIncome ?? 0,
      dueAtSigning: dueAtSigningAmount ?? 0,
      dueAtSigningAmount: dueAtSigningAmount ?? 0,
      dueAtSigningRawText: moveInCosts.dueAtSigningRawText,
      dueAtSigningNeedsConfirmation: !dueAtSigningAmount,
      firstMonthRent: firstMonthRent ?? 0,
      securityDeposit: securityDeposit ?? 0,
      firstMonthRentAmount: firstMonthRent ?? 0,
      securityDepositAmount: securityDeposit ?? 0,
      brokerFee: moveInCosts.brokerFee ?? 0,
      petFee: moveInCosts.petFee ?? 0,
      otherMoveInFees: moveInCosts.otherMoveInFees ?? 0,
      incomeAmount: incomeAmount || null,
      incomeFrequency,
      applicantGrossMonthlyIncome: normalizedMonthlyIncome,
      applicantAnnualIncome: incomeFrequency === "yearly" ? incomeAmount : null,
      applicantIncomeAmount: incomeAmount || null,
      applicantIncomeFrequency: incomeFrequency,
      normalizedMonthlyIncome,
      incomeToRentRatio,
      housingSupport:
        /voucher|subsidy|section 8/i.test(currentResult.voucherInfo)
          ? "Voucher"
          : "None",
      supportProgram: truncateForField(currentResult.voucherInfo, 150),
      monthlySubsidyAmount: 0,
      tenantPortionRent: parseMoneyAmount(currentResult.tenantPortion) ?? 0,
      tenantPortion: parseMoneyAmount(currentResult.tenantPortion) ?? 0,
      voucherPortion: 0,
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
      rawText: sourceMaterial,
      rawPastedText: input,
      sourceText: input,
      extractedDocumentText: lastDocumentExtractText,
      documentExtracts: lastDocumentExtractText,
      uploadedFiles,
      suggestedMessage: currentResult.suggestedMessage,
      extractedFieldSummary: [
        `Income: ${currentResult.householdIncomeDisplay}`,
        `Rent: ${formatRentDisplay(monthlyRent || null)}`,
        propertyAddressNote,
        propertyContext.utilitiesIncluded ? "Utilities included: yes" : "Utilities included: no",
        `Due at signing: ${formatMoveInMoney(dueAtSigningAmount) || "Needs confirmation"}`,
        `Move-in breakdown: ${dueAtSigningBreakdown}`,
        `Ratio: ${formatAffordabilityDisplay(normalizedMonthlyIncome, monthlyRent || null)}`,
        `AI recommendation: ${currentResult.suggestedStatus || "Not provided"}`,
        `Saved status: ${selectedSaveStatus}`,
      ].join("\n"),
      applicantSummary: currentResult.confidenceReason,
      aiRecommendedStatus: currentResult.suggestedStatus,
      summary: currentResult.confidenceReason,
      concerns: currentResult.redFlagsOrConcerns.length
        ? currentResult.redFlagsOrConcerns
        : [currentResult.mainConcern].filter(Boolean),
      strengths: [currentResult.mainStrength].filter(Boolean),
      missingDocuments: normalizedMissingDocuments,
      receivedDocuments: currentResult.documentsMentioned,
      followUpQuestions: currentResult.followUpQuestions,
      extractedFields: {
        applicantName: currentResult.applicantName,
        phone: currentResult.phone,
        email: currentResult.email,
        income: currentResult.householdIncomeDisplay,
        employment: currentResult.employmentInfo,
        rent: formatRentDisplay(monthlyRent || null),
        dueAtSigning: dueAtSigningAmount,
        dueAtSigningBreakdown,
        property: propertyContext,
        moveInDate: currentResult.moveInDate,
        occupants: currentResult.occupants,
        petsSmoking: currentResult.petsSmoking,
        voucher: currentResult.voucherInfo,
        tenantPortion: currentResult.tenantPortion,
        aiRecommendedStatus: currentResult.suggestedStatus,
        savedStatus: selectedSaveStatus,
      },
      nextStep: currentResult.bestNextStep,
      confidenceLevel: currentResult.confidenceLevel,
      confidenceReason: currentResult.confidenceReason,
      readiness: boundedNumber(currentResult.readiness, 0),
      riskLevel: currentResult.riskLevel,
      notes: importantNotes,
      importantNotes,
      status: selectedSaveStatus,
    });
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
          payloadSummary: {
            noteCount: Array.isArray(payload.notes) ? payload.notes.length : 0,
            noteLengths: Array.isArray(payload.notes)
              ? payload.notes.map((note) => String(note).length)
              : [],
            rawTextLength: String(payload.rawText ?? "").length,
            uploadedFiles: payload.uploadedFiles,
          },
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
    setSelectedFiles([]);
    setFileStatus("");
    setLastReviewInput("");
    setLastDocumentExtractText("");
    setSelectedSaveStatus("New");
    setPropertyForm(emptyPropertyForm());
    setAddressSuggestions([]);
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

  function handleFileChange(files: FileList | null) {
    const incomingFiles = Array.from(files ?? []);
    if (incomingFiles.length === 0) return;
    setSelectedFiles((current) => {
      const existingKeys = new Set(
        current.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );
      const nextFiles = [...current];
      incomingFiles.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existingKeys.has(key)) {
          nextFiles.push(file);
          existingKeys.add(key);
        }
      });
      return nextFiles;
    });
    setFileStatus("");
    resetSavedState();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setFileStatus("");
    resetSavedState();
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

          <div className="mt-4 rounded-[20px] border border-[#b8c4d4] bg-[#f8fafc] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-black text-[#071126]">
                  Rental Property
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#475569]">
                  No property selected — rent and location-specific screening may be incomplete.
                </p>
              </div>
              {savedProperties.length > 0 ? (
                <label className="grid gap-1 text-xs font-bold text-[#475569] sm:min-w-56">
                  <span>Choose saved property</span>
                  <select
                    className="dashboard-input text-sm"
                    value={propertyForm.propertyId}
                    onChange={(event) => chooseSavedProperty(event.target.value)}
                  >
                    <option value="">Manual property</option>
                    {savedProperties.map((property) => (
                      <option key={property._id} value={property._id}>
                        {property.name || property.address}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="relative grid gap-1 text-xs font-bold text-[#475569] sm:col-span-2">
                <span>Property address</span>
                <input
                  className="dashboard-input text-sm"
                  value={propertyForm.propertyAddress}
                  onChange={(event) =>
                    updatePropertyForm("propertyAddress", event.target.value)
                  }
                  placeholder="Start typing property address..."
                  autoComplete="off"
                />
                {addressPending ? (
                  <span className="absolute right-3 top-8 text-[10px] uppercase tracking-wider text-[#64748b]">
                    Finding
                  </span>
                ) : null}
                {addressSuggestions.length > 0 ? (
                  <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[18px] border border-[#94a3b8] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
                    {addressSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className="block w-full border-b border-[#b8c4d4] px-4 py-3 text-left transition hover:bg-[#fff0ea] last:border-b-0"
                        onClick={() => applyAddressSuggestion(suggestion)}
                      >
                        <span className="block text-sm font-semibold text-[#071126]">
                          {suggestion.formatted}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-[#334155]">
                          {[suggestion.city, suggestion.state, suggestion.postalCode]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {!addressLookupAvailable ? (
                  <span className="text-xs font-semibold text-[#64748b]">
                    Address autocomplete is unavailable. Manual entry will still save.
                  </span>
                ) : null}
              </label>

              <PropertyInput
                label="Unit / apartment"
                value={propertyForm.propertyUnit}
                onChange={(value) => updatePropertyForm("propertyUnit", value)}
                placeholder="Apt 2B"
              />
              <PropertyInput
                label="Borough / neighborhood"
                value={propertyForm.borough}
                onChange={(value) => updatePropertyForm("borough", value)}
                placeholder="Brooklyn, Astoria, Downtown"
              />
              <PropertyInput
                label="Bedroom count"
                type="number"
                value={propertyForm.bedrooms}
                onChange={(value) => updatePropertyForm("bedrooms", value)}
                placeholder="2"
              />
              <PropertyInput
                label="Bathroom count"
                type="number"
                value={propertyForm.bathrooms}
                onChange={(value) => updatePropertyForm("bathrooms", value)}
                placeholder="1"
              />
              <PropertyInput
                label="Monthly asking rent"
                type="number"
                value={propertyForm.monthlyRent}
                onChange={(value) => updatePropertyForm("monthlyRent", value)}
                placeholder="2300"
              />
              <PropertyInput
                label="Property/listing nickname"
                value={propertyForm.propertyNickname}
                onChange={(value) => updatePropertyForm("propertyNickname", value)}
                placeholder="Ryder St 2BR"
              />
              <label className="flex min-h-12 items-center gap-3 rounded-[14px] border border-[#cbd5e1] bg-white px-3 text-sm font-bold text-[#071126]">
                <input
                  type="checkbox"
                  checked={propertyForm.utilitiesIncluded}
                  onChange={(event) =>
                    updatePropertyForm("utilitiesIncluded", event.target.checked)
                  }
                />
                Utilities included
              </label>
            </div>
          </div>

          <textarea
            className="mt-4 min-h-56 w-full rounded-[18px] border border-[#94a3b8] bg-white px-4 py-3 text-base font-semibold leading-7 text-[#071126] outline-none placeholder:text-[#475569] focus:border-[#ff4b1f] focus:shadow-[0_0_0_3px_rgba(255,75,31,0.22)]"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              resetSavedState();
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
                multiple
                onChange={(event) => handleFileChange(event.target.files)}
              />
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </button>
              {selectedFiles.length === 0 ? (
                <span className="inline-flex min-h-9 items-center rounded-full border border-[#cbd5e1] bg-white px-3 text-xs font-bold text-[#64748b]">
                  No file selected
                </span>
              ) : null}
            </div>
            {selectedFiles.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {selectedFiles.map((file, index) => (
                  <span
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="inline-flex min-h-11 max-w-full items-center justify-between gap-3 rounded-full border border-[#b8c4d4] bg-white px-3 py-2 text-xs font-bold text-[#334155]"
                  >
                    <span className="min-w-0 truncate">
                      {file.name}
                      <span className="ml-2 text-[#64748b]">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-[#dc2626] hover:text-[#991b1b]"
                      onClick={() => removeFile(index)}
                    >
                      Remove
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            {fileStatus ? (
              <p className="mt-3 text-xs font-bold text-[#0369a1]">{fileStatus}</p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={pending || (!input.trim() && selectedFiles.length === 0)}
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
                {result.rentWarning ? (
                  <p className="mt-2 text-xs font-bold text-amber-700">
                    {result.rentWarning}
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
                    ["AI recommendation", result.suggestedStatus || "Not provided"],
                    ["Saved status", selectedSaveStatus],
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

              <label className="mt-4 grid gap-2 rounded-2xl border border-[#b8c4d4] bg-white p-4 text-sm font-bold text-[#071126]">
                <span>Saved database status</span>
                <select
                  className="dashboard-input text-sm"
                  value={selectedSaveStatus}
                  onChange={(event) =>
                    setSelectedSaveStatus(
                      normalizeApplicantStatus(event.target.value),
                    )
                  }
                  disabled={saving || Boolean(savedApplicantId)}
                >
                  {applicantStatusValues.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <span className="text-xs font-semibold text-[#475569]">
                  AI recommendation: {result.suggestedStatus || "Not provided"}
                </span>
              </label>

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

function PropertyInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-[#475569]">
      <span>{label}</span>
      <input
        type={type}
        className="dashboard-input text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={type === "number" ? "0" : undefined}
      />
    </label>
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
