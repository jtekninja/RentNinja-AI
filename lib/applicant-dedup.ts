import { createHash } from "node:crypto";

const businessTimezone = "America/New_York";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 0 ? digits : "no-phone";
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeMoney(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export function buildApplicantFingerprint(input: {
  email: string;
  phone: string;
  name: string;
  monthlyRent: number;
  monthlyIncome: number;
}) {
  const identityBasis =
    input.email.trim()
      ? `email:${normalizeEmail(input.email)}`
      : input.phone.trim()
        ? `phone:${normalizePhone(input.phone)}`
        : `name:${normalizeName(input.name)}|rent:${normalizeMoney(input.monthlyRent)}|income:${normalizeMoney(input.monthlyIncome)}`;

  return createHash("sha256").update(identityBasis).digest("hex");
}

export function buildApplicantDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: businessTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
