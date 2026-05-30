"use client";

import Link from "next/link";
import { useState, useMemo, startTransition } from "react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/ui/logo";
import { BrandBackground } from "@/components/ui/brand-background";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { demoApplicants } from "@/lib/demo-data";
import { getApplicantIntelligence } from "@/lib/applicant-intelligence";
import type { ApplicantRecord } from "@/components/dashboard/applicant-list";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import { getNextBestAction } from "@/lib/next-best-action";

// ── Props ────────────────────────────────────────────────────────────────────
type DashboardProps = {
  initialApplicants: ApplicantRecord[];
  organization: {
    _id: string;
    name: string;
    plan: string;
    billingStatus: string;
    hasBillingCustomer: boolean;
  } | null;
  user: {
    name?: string | null;
    email?: string | null;
    role?: "owner" | "admin" | "member" | "viewer";
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const planLabel: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  agency: "Agency",
};

function readinessLabel(percent: number) {
  if (percent >= 85) return "Ready Now";
  if (percent >= 70) return "Almost Ready";
  if (percent >= 40) return "Needs Follow-Up";
  return "Not Ready";
}

function readinessPillClass(percent: number) {
  if (percent >= 85) return "pill pill-success";
  if (percent >= 70) return "pill pill-info";
  if (percent >= 40) return "pill pill-warning";
  return "pill pill-error";
}

function scoreColor(score: number) {
  if (score >= 80) return "text-[#059669]";
  if (score >= 65) return "text-[#d97706]";
  return "text-[#dc2626]";
}

// ── Component ────────────────────────────────────────────────────────────────
export function ApplicantDashboard({
  initialApplicants,
  organization,
  user,
}: DashboardProps) {
  const [applicants, setApplicants] = useState(initialApplicants);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoWalkthroughOpen, setDemoWalkthroughOpen] = useState(false);
  const planName =
    planLabel[organization?.plan ?? "starter"] ??
    organization?.plan ??
    "Starter";
  const userEmail = user.email ?? "Account";

  // ── Demo data loader ──
  function loadDemoData() {
    startTransition(() => setApplicants(demoApplicants));
  }

  // ── Computed ────────────────────────────────────────────────────────────────
  const applicantsIntel = useMemo(
    () =>
      applicants.map((a) => ({
        applicant: a,
        intel: getApplicantIntelligence(a),
      })).map((item) => ({
        ...item,
        nextAction: getNextBestAction(item.applicant, item.intel),
      })),
    [applicants],
  );

  // Simple stats (section E — only 4 numbers)
  const stats = useMemo(() => {
    const ready = applicantsIntel.filter((a) => a.intel.readiness >= 85).length;
    const missingDocs = applicantsIntel.filter(
      (a) => a.intel.documentsMissing.length > 0,
    ).length;
    const avgReadiness = applicantsIntel.length
      ? Math.round(
          applicantsIntel.reduce((s, a) => s + a.intel.readiness, 0) /
            applicantsIntel.length,
        )
      : 0;
    return { total: applicants.length, ready, missingDocs, avgReadiness };
  }, [applicantsIntel]);

  // Fastest ready candidate (section C)
  const fastestReady = useMemo(() => {
    return [...applicantsIntel].sort((a, b) => {
      if (b.intel.readiness !== a.intel.readiness)
        return b.intel.readiness - a.intel.readiness;
      return b.intel.score - a.intel.score;
    })[0];
  }, [applicantsIntel]);

  // Priority feed items (section B — top 3 actions)
  const priorityItems = useMemo(() => {
    return applicantsIntel
      .filter(
        (a) => a.intel.documentsMissing.length > 0 || a.intel.readiness < 85,
      )
      .sort((a, b) => a.intel.readiness - b.intel.readiness)
      .slice(0, 3)
      .map((a) => ({
        id: a.applicant._id,
        name: a.applicant.name,
        action:
          a.intel.documentsMissing.length > 0
            ? `Missing: ${a.intel.documentsMissing.slice(0, 2).join(", ")}${a.intel.documentsMissing.length > 2 ? " + more" : ""}`
            : "Manual review needed",
        readiness: a.intel.readiness,
      }));
  }, [applicantsIntel]);

  // Recent applicants (section D)
  const recentApplicants = useMemo(() => {
    return [...applicantsIntel]
      .sort(
        (a, b) =>
          new Date(b.applicant.updatedAt).getTime() -
          new Date(a.applicant.updatedAt).getTime(),
      )
      .slice(0, 5);
  }, [applicantsIntel]);

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden bg-[#e8eef6] text-[#071126]">
      <BrandBackground variant="dashboard" />
      {/* ── Mobile top bar ── */}
      <div className="sticky top-0 z-30 -mx-0 bg-[#e8eef6]/95 px-4 py-3 backdrop-blur sm:px-6 lg:hidden">
        <div className="flex items-center justify-between">
          <Logo />
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-full border border-[#b8c4d4] bg-white px-3 text-xs font-black text-[#071126] shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
            aria-label="Open account menu"
          >
            Account
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile sidebar drawer ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
          <nav className="relative z-50 flex h-full w-[min(20rem,88vw)] flex-col overflow-y-auto border-r border-[#b8c4d4] bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button
                onClick={() => setSidebarOpen(false)}
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-[#94a3b8] bg-white text-sm font-black text-[#071126]"
                aria-label="Close account menu"
              >
                X
              </button>
            </div>
            <div className="mb-4 rounded-[20px] border border-[#b8c4d4] bg-[#f8fafc] p-4">
              <p className="truncate text-sm font-black text-[#071126]">
                {userEmail}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex min-h-[34px] items-center rounded-full border border-[#b8c4d4] bg-white px-3 text-xs font-black uppercase text-[#071126]">
                  {planName.toUpperCase()}
                </span>
                <span className="inline-flex min-h-[34px] items-center rounded-full border border-[#b8c4d4] bg-white px-3 text-xs font-black text-[#071126]">
                  {stats.total} applicants
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/billing"
                  onClick={() => setSidebarOpen(false)}
                  className="field-action !min-h-[40px] !px-3 !text-xs"
                >
                  Billing
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setSidebarOpen(false)}
                  className="field-action !min-h-[40px] !px-3 !text-xs"
                >
                  Settings
                </Link>
              </div>
            </div>
            <div className="space-y-1">
              {[
                { href: "/dashboard", label: "Dashboard" },
                { href: "/dashboard/applicants", label: "Applicants" },
                { href: "/dashboard/new", label: "Add Applicant" },
                { href: "/dashboard/ai", label: "AI Tools" },
                { href: "/dashboard/reports", label: "Reports" },
                { href: "/dashboard/billing", label: "Billing" },
                { href: "/dashboard/settings", label: "Settings" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="flex min-h-[44px] items-center rounded-lg px-3 py-3 text-sm font-semibold hover:bg-[#fff0ea] hover:text-[#ff4b1f]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto space-y-2 pt-6">
              {(user.role === "owner" || user.role === "admin") && (
                <Link
                  href="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="flex min-h-[44px] items-center rounded-lg px-3 py-3 text-sm font-semibold hover:bg-[#fff0ea] hover:text-[#ff4b1f]"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex min-h-[44px] w-full items-center rounded-lg px-3 py-3 text-left text-sm font-semibold hover:bg-[#fff0ea] hover:text-[#ff4b1f]"
              >
                Sign out
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col gap-6 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-8">
        {/* ═══════════════════════════════════════════════════════════════════
            SECTION A — Welcome card
            ════════════════════════════════════════════════════════════════ */}
        <header className="card p-4 sm:p-6">
          <div className="hidden items-start justify-between gap-5 lg:flex">
            <Logo />
            <div className="flex items-start gap-2 rounded-[22px] border border-[#b8c4d4] bg-[#f8fafc] p-2 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
              <span className="inline-flex min-h-[38px] items-center rounded-full border border-[#b8c4d4] bg-white px-4 text-xs font-black uppercase tracking-wide text-[#071126]">
                {planName.toUpperCase()}
              </span>
              <span className="inline-flex min-h-[38px] items-center rounded-full border border-[#b8c4d4] bg-white px-4 text-xs font-black text-[#071126]">
                {stats.total} applicants
              </span>
              <div className="min-w-0 rounded-[16px] border border-[#b8c4d4] bg-white px-4 py-2">
                <p className="max-w-[220px] truncate text-xs font-bold text-[#475569]">
                  {userEmail}
                </p>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="mt-1 text-xs font-black text-[#ff4b1f] hover:text-[#e63e16]"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>

          <div className="mt-0 space-y-3 lg:mt-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {user.name
                  ? `Good ${getGreeting()}, ${user.name.split(" ")[0]}`
                  : "Pick the strongest applicant faster"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#334155]">
                Paste applicant info. RentNinja organizes it, scores it, shows
                what's missing, and tells you the next best step.
              </p>
            </div>
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
              <Link href="/dashboard/ai#one-minute" className="btn-primary w-full sm:w-auto">
                Start 1-Minute Applicant Review
              </Link>
              <Link href="/dashboard/new" className="btn-secondary w-full sm:w-auto">
                Add Applicant
              </Link>
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION E — Simple stats row (only 4)
            ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Active applicants", value: stats.total },
            { label: "Ready for review", value: stats.ready },
            { label: "Missing documents", value: stats.missingDocs },
            { label: "Avg readiness", value: `${stats.avgReadiness}%` },
          ].map((stat) => (
            <div key={stat.label} className="card-inner px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-black text-[#071126]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {fastestReady ? (
          <section className="card p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                  What Should I Do Next?
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {fastestReady.nextAction.nextBestActionLabel}
                </h2>
                <p className="mt-1 text-sm font-semibold text-[#475569]">
                  {fastestReady.nextAction.nextBestActionReason}
                </p>
              </div>
              <Link
                href={`/dashboard/applicants/${fastestReady.applicant._id}`}
                className="btn-primary text-sm"
              >
                Act on this applicant
              </Link>
            </div>
          </section>
        ) : null}

        {/* ═══════════════════════════════════════════════════════════════════
            Demo mode loader
            ════════════════════════════════════════════════════════════════ */}
        {process.env.NODE_ENV === "development" && (
          <div className="card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                  Demo Mode
                </p>
                <p className="mt-1 text-base font-bold">
                  Load sample data to preview the dashboard
                </p>
                <p className="mt-1 text-sm text-[#475569]">
                  5 applicants with different scores, statuses, and AI
                  summaries.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={loadDemoData} className="btn-primary">
                  Load Demo Data
                </button>
                <button
                  type="button"
                  onClick={() => setDemoWalkthroughOpen((open) => !open)}
                  className="btn-secondary"
                >
                  Run Demo Walkthrough
                </button>
              </div>
            </div>
            {demoWalkthroughOpen ? (
              <div className="mt-4 grid gap-2 border-t border-[#e8eef6] pt-4 text-sm font-semibold text-[#334155] sm:grid-cols-2 lg:grid-cols-4">
                {[
                  "Paste a messy applicant message",
                  "AI extracts clean applicant details",
                  "RentNinja shows missing documents",
                  "Ninja Decision Score appears",
                  "One-click follow-up is generated",
                  "Owner report is created",
                  "Applicant moves to Ready for Review",
                  "Time saved receipt is shown",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-[#b8c4d4] bg-white px-4 py-3"
                  >
                    <span className="text-xs font-black text-[#ff4b1f]">
                      {index + 1}.
                    </span>{" "}
                    {step}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {applicants.length === 0 ? <OnboardingCard /> : null}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION C — Fastest Ready Candidate
            ════════════════════════════════════════════════════════════════ */}
        {fastestReady && (
          <section className="card overflow-hidden">
            <div className="border-b border-[#e8eef6] px-5 py-4 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                Fastest Ready Candidate
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {fastestReady.applicant.name}
              </h2>
              <p className="mt-1 text-sm text-[#475569]">
                Best applicant to act on today based on readiness,
                documentation, and score.
              </p>
            </div>
            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border-b border-r border-[#e8eef6] px-5 py-4 sm:border-b-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  Readiness
                </p>
                <p className="mt-1 text-2xl font-black text-[#ff4b1f]">
                  {fastestReady.intel.readiness}%
                </p>
                <span
                  className={readinessPillClass(fastestReady.intel.readiness)}
                >
                  {readinessLabel(fastestReady.intel.readiness)}
                </span>
              </div>
              <div className="border-b border-r border-[#e8eef6] px-5 py-4 sm:border-b-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  Score
                </p>
                <p
                  className={`mt-1 text-2xl font-black ${scoreColor(fastestReady.intel.score)}`}
                >
                  {fastestReady.intel.score}/100
                </p>
              </div>
              <div className="border-b border-r border-[#e8eef6] px-5 py-4 sm:border-b-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  Risk
                </p>
                <p className="mt-1 text-2xl font-black text-[#071126]">
                  {fastestReady.intel.riskLevel}
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                  Next Step
                </p>
                <p className="mt-1 text-sm font-bold leading-snug text-[#071126]">
                  {fastestReady.nextAction.nextBestActionLabel}
                </p>
                {fastestReady.intel.documentsMissing.length > 0 && (
                  <p className="mt-2 text-xs font-semibold text-[#dc2626]">
                Request:{" "}
                    {fastestReady.intel.documentsMissing.slice(0, 3).join(", ")}
                    {fastestReady.intel.documentsMissing.length > 3 &&
                      " + more"}
                  </p>
                )}
              </div>
            </div>
            <div className="border-t border-[#e8eef6] px-5 py-3 sm:px-6">
              <Link
                href={`/dashboard/applicants/${fastestReady.applicant._id}`}
                className="btn-primary text-sm"
              >
                Act on this applicant
              </Link>
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION B + D — Priority + Recent in 2-col layout
            ════════════════════════════════════════════════════════════════ */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Smart Missing Docs */}
          <section className="card p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
              Smart Missing Docs
            </p>
            <h2 className="mt-1 text-lg font-bold">Who needs attention</h2>

            {priorityItems.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[#b8c4d4] p-6 text-center">
                <p className="text-sm font-semibold text-[#475569]">
                  All caught up
                </p>
                <p className="mt-1 text-xs text-[#475569]">
                  No pending actions right now.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {priorityItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/dashboard/applicants/${item.id}`}
                    className="flex items-center justify-between rounded-xl border border-[#e8eef6] px-4 py-3 transition hover:border-[#ff4b1f] hover:bg-[#fff0ea]/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#071126] truncate">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-[#475569]">
                        {item.action.startsWith("Missing:")
                          ? "Request missing documents"
                          : item.action}
                      </p>
                    </div>
                    <span className={readinessPillClass(item.readiness)}>
                      {item.readiness}%
                    </span>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-4">
              <Link
                href="/dashboard/applicants"
                className="text-sm font-bold text-[#ff4b1f] hover:underline"
              >
                View all applicants -&gt;
              </Link>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="card p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              Recent Activity
            </p>
            <h2 className="mt-1 text-lg font-bold">Recently updated</h2>

            {recentApplicants.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[#b8c4d4] p-6 text-center">
                <p className="text-sm font-semibold text-[#475569]">
                  No applicants yet
                </p>
                <p className="mt-1 text-xs text-[#475569]">
                  Add your first applicant to get started.
                </p>
                <Link
                  href="/dashboard/new"
                  className="btn-primary mt-4 inline-flex text-sm"
                >
                  Add Applicant
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentApplicants.map(({ applicant, intel, nextAction }) => (
                  <Link
                    key={applicant._id}
                    href={`/dashboard/applicants/${applicant._id}`}
                    className="flex items-center gap-4 rounded-xl border border-[#e8eef6] px-4 py-3 transition hover:border-[#ff4b1f] hover:bg-[#fff0ea]/50"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8eef6] text-sm font-bold text-[#475569]">
                      {applicant.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#071126] truncate">
                        {applicant.name}
                      </p>
                      <p className="truncate text-xs text-[#475569]">
                        {applicant.propertyCity}, {applicant.propertyState} |
                        Status {applicant.status} | Score {intel.score} | Next:{" "}
                        {nextAction.nextBestActionLabel}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={readinessPillClass(intel.readiness)}>
                        {readinessLabel(intel.readiness)}
                      </span>
                      {intel.documentsMissing.length > 0 && (
                        <span className="text-[10px] font-semibold text-[#dc2626]">
                          {intel.documentsMissing.length} missing
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            AI Tools shortcut
            ════════════════════════════════════════════════════════════════ */}
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                AI Tools
              </p>
              <h2 className="mt-1 text-lg font-bold">Speed up your review</h2>
            </div>
            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Link href="/dashboard/ai#one-minute" className="btn-secondary w-full text-sm sm:w-auto">
                1-Minute Applicant Review
              </Link>
              <Link href="/dashboard/compare" className="btn-secondary w-full text-sm sm:w-auto">
                Compare
              </Link>
              <Link
                href="/dashboard/messages"
                className="btn-secondary w-full text-sm sm:w-auto"
              >
                Generate Message
              </Link>
              <Link href="/dashboard/reports" className="btn-secondary w-full text-sm sm:w-auto">
                Owner Report
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            Compliance reminder
            ════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-[#b8c4d4] bg-white px-4 py-3 text-center text-xs font-bold text-[#475569]">
          Fair Housing Mode: On. RentNinja uses objective screening criteria
          only. Final decisions are your responsibility.
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
