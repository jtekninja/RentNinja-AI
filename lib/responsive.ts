/**
 * lib/responsive.ts
 *
 * Centralized responsive design tokens, utility functions, and type-safe
 * class name builders for consistent mobile-first layouts across the app.
 *
 * Every new page, component, and section should reference these exports
 * rather than hardcoding breakpoint-specific class strings inline.
 *
 * Usage:
 *   import { container, card, heading, spacing, gridCols, form, layout, cx } from "@/lib/responsive";
 */

// ── Container ────────────────────────────────────────────────────────────────
export const container = {
  page: "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8",
  narrow: "mx-auto w-full max-w-[1024px] px-4 sm:px-6 lg:px-8",
  form: "mx-auto w-full max-w-[640px] px-4 sm:px-6",
} as const;

// ── Card ─────────────────────────────────────────────────────────────────────
export const card = {
  section: "rounded-[32px] border border-white/10 bg-white/5 p-5",
  inner: "rounded-[24px] border border-white/8 bg-black/15 p-4",
  metric: "rounded-[22px] border border-white/8 bg-black/15 p-4",
  feature: "rounded-[28px] border border-white/10 bg-black/20 p-5",
} as const;

// ── Heading ───────────────────────────────────────────────────────────────────
export const heading = {
  hero: "text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white",
  section: "text-2xl md:text-3xl font-semibold text-white",
  card: "text-xl font-semibold text-white",
  label: "text-xs uppercase tracking-[0.24em] text-[#f7b36d]",
} as const;

// ── Spacing ───────────────────────────────────────────────────────────────────
export const spacing = {
  page: "gap-6",
  cardList: "gap-5",
  grid: "gap-4",
  inline: "gap-3",
} as const;

// ── Grid Columns ──────────────────────────────────────────────────────────────
export const gridCols = {
  responsive: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  statRow: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  metricRow: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  summary: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
} as const;

// ── Form ──────────────────────────────────────────────────────────────────────
export const form = {
  input:
    "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-[#f7b36d]/60",
  select:
    "w-full rounded-2xl border border-white/10 bg-[#12161e] px-4 py-3 text-base text-white outline-none transition focus:border-[#f7b36d]/60",
  textarea:
    "min-h-28 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-[#f7b36d]/60",
  fieldLabel: "grid gap-2 text-sm text-slate-200",
} as const;

// ── Layout ────────────────────────────────────────────────────────────────────
export const layout = {
  flexWrap: "flex flex-wrap gap-3",
  flexStack: "flex flex-col sm:flex-row sm:flex-wrap gap-3",
  scrollableContent: "flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto",
} as const;

// ── Utility ───────────────────────────────────────────────────────────────────
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
