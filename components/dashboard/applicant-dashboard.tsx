"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BillingCard } from "@/components/dashboard/billing-card";
import { ApplicantForm, type ApplicantFormValues } from "@/components/dashboard/applicant-form";
import { ApplicantList, type ApplicantRecord } from "@/components/dashboard/applicant-list";
import { Logo } from "@/components/ui/logo";
import type { ApplicantComparison } from "@/lib/ai-types";

type DashboardShellProps = {
  initialApplicants: ApplicantRecord[];
  organization: {
    _id: string;
    name: string;
    plan: string;
    billingStatus: string;
    hasBillingCustomer: boolean;
    complianceSettings: {
      defaultPropertyCity: string;
      defaultPropertyState: string;
    };
  } | null;
  user: {
    name?: string | null;
    email?: string | null;
    role?: "owner" | "member";
  };
  billingEnabled: boolean;
  addressLookupEnabled: boolean;
};

type DecisionFilter = "All" | "Strong" | "Review" | "Risk";
type SortValue = "newest" | "highest-score" | "highest-affordability";

export function ApplicantDashboard({
  initialApplicants,
  organization,
  user,
  billingEnabled,
  addressLookupEnabled
}: DashboardShellProps) {
  const [applicants, setApplicants] = useState(initialApplicants);
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("All");
  const [propertyFilter, setPropertyFilter] = useState("All properties");
  const [sortBy, setSortBy] = useState<SortValue>("newest");
  const [editingApplicant, setEditingApplicant] = useState<ApplicantFormValues | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [comparison, setComparison] = useState<ApplicantComparison | null>(null);
  const [comparisonPending, setComparisonPending] = useState(false);

  const deferredQuery = useDeferredValue(query);

  const filteredApplicants = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return [...applicants]
      .filter((applicant) => {
        if (decisionFilter !== "All" && applicant.decision !== decisionFilter) {
          return false;
        }

        if (propertyFilter !== "All properties") {
          const propertyLabel = [applicant.propertyAddress, applicant.propertyCity, applicant.propertyState, applicant.propertyPostalCode]
            .filter(Boolean)
            .join(", ");
          if (propertyLabel !== propertyFilter) {
            return false;
          }
        }

        if (!normalizedQuery) {
          return true;
        }

        return [applicant.name, applicant.email, applicant.status, applicant.propertyAddress, applicant.propertyCity, applicant.propertyState, applicant.propertyPostalCode]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortBy === "highest-score") return b.totalScore - a.totalScore;
        if (sortBy === "highest-affordability") return b.affordabilityRatio - a.affordabilityRatio;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [applicants, decisionFilter, deferredQuery, propertyFilter, sortBy]);

  const propertyOptions = useMemo(() => {
    const uniqueProperties = Array.from(
      new Set(
        applicants
          .map((applicant) => [applicant.propertyAddress, applicant.propertyCity, applicant.propertyState, applicant.propertyPostalCode].filter(Boolean).join(", "))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ["All properties", ...uniqueProperties];
  }, [applicants]);

  const summary = useMemo(() => {
    const strong = applicants.filter((item) => item.decision === "Strong").length;
    const review = applicants.filter((item) => item.decision === "Review").length;
    const risk = applicants.filter((item) => item.decision === "Risk").length;
    const avgScore =
      applicants.length > 0
        ? Math.round(applicants.reduce((sum, item) => sum + item.totalScore, 0) / applicants.length)
        : 0;
    const avgAffordability =
      applicants.length > 0
        ? applicants.reduce((sum, item) => sum + item.affordabilityRatio, 0) / applicants.length / 5
        : 0;

    return {
      total: applicants.length,
      strong,
      review,
      risk,
      avgScore,
      avgAffordability
    };
  }, [applicants]);

  async function saveApplicant(values: ApplicantFormValues) {
    setPending(true);
    setMessage("");

    try {
      const endpoint = values._id ? `/api/applicants/${values._id}` : "/api/applicants";
      const method = values._id ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to save applicant.");
        return false;
      }

      startTransition(() => {
        setApplicants((current) => {
          if (values._id) {
            return current.map((item) => (item._id === data._id ? data : item));
          }

          return [data, ...current];
        });
      });

      setEditingApplicant(null);
      setMessage(values._id ? "Applicant updated." : "Applicant created.");
      return true;
    } finally {
      setPending(false);
    }
  }

  async function deleteApplicant(id: string) {
    setMessage("");
    const response = await fetch(`/api/applicants/${id}`, { method: "DELETE" });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Unable to delete applicant.");
      return;
    }

    startTransition(() => {
      setApplicants((current) => current.filter((item) => item._id !== id));
    });

    if (editingApplicant?._id === id) {
      setEditingApplicant(null);
    }
  }

  async function runAiComparison() {
    setComparisonPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/ai/compare", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to compare applicants.");
        return;
      }

      setComparison(data);
    } finally {
      setComparisonPending(false);
    }
  }

  const applicantNameById = useMemo(
    () => Object.fromEntries(applicants.map((applicant) => [applicant._id, applicant.name])),
    [applicants]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(247,179,109,0.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(92,174,255,0.14),transparent_24%),linear-gradient(180deg,#10131a_0%,#0b0e13_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[34px] border border-white/10 bg-white/6 px-5 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-5">
              <Logo />
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#f7b36d]">Tenant Screening Dashboard</p>
                <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Screen applicants, catch red flags early, and keep leasing decisions inside one SaaS workspace.
                </h1>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
                <p className="font-semibold text-white">{user.name || "Operator"}</p>
                <p>{user.email}</p>
              </div>
              {user.role === "owner" ? (
                <Link href="/admin">
                  <Button variant="secondary" type="button">
                    Admin
                  </Button>
                </Link>
              ) : null}
              <Button variant="ghost" type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
                Sign out
              </Button>
            </div>
          </div>
        </header>

        <SummaryCards summary={summary} />

        <div className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-5">
            <ApplicantForm
              initialApplicant={editingApplicant}
              submitting={pending}
              onSubmit={saveApplicant}
              onCancelEdit={() => setEditingApplicant(null)}
              defaultPropertyCity={organization?.complianceSettings.defaultPropertyCity ?? ""}
              defaultPropertyState={organization?.complianceSettings.defaultPropertyState ?? ""}
              addressLookupEnabled={addressLookupEnabled}
            />
            {organization ? (
              <BillingCard
                organizationName={organization.name}
                plan={organization.plan}
                billingStatus={organization.billingStatus}
                billingEnabled={billingEnabled}
                hasBillingCustomer={organization.hasBillingCustomer}
              />
            ) : null}
          </div>

          <div className="space-y-5">
            <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">Pipeline</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Applicants you can act on today</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <input
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#f7b36d]/60"
                    placeholder="Search applicant"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <select
                    className="rounded-full border border-white/10 bg-[#10141c] px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#f7b36d]/60"
                    value={decisionFilter}
                    onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)}
                  >
                    {["All", "Strong", "Review", "Risk"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-full border border-white/10 bg-[#10141c] px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#f7b36d]/60"
                    value={propertyFilter}
                    onChange={(event) => setPropertyFilter(event.target.value)}
                  >
                    {propertyOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-full border border-white/10 bg-[#10141c] px-4 py-2.5 text-sm text-white outline-none transition focus:border-[#f7b36d]/60"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortValue)}
                  >
                    <option value="newest">Newest</option>
                    <option value="highest-score">Highest score</option>
                    <option value="highest-affordability">Highest affordability</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button type="button" onClick={runAiComparison} disabled={comparisonPending || applicants.length < 2}>
                  {comparisonPending ? "Ranking applicants..." : "AI compare applicants"}
                </Button>
                <p className="text-sm text-slate-300">Compare the current pool and get a plain-English recommendation.</p>
              </div>

              {message ? <p className="mt-4 text-sm text-amber-100">{message}</p> : null}
            </section>

            {comparison ? (
              <section className="rounded-[32px] border border-sky-300/15 bg-sky-300/8 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-sky-100">AI Comparison</p>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white">
                    Best fit: {applicantNameById[comparison.bestApplicantId] || "Top applicant"}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-100">{comparison.overview}</p>
                <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
                  <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Ranking</p>
                    <ul className="mt-3 grid gap-2 text-sm text-slate-100">
                      {comparison.ranking.map((item) => (
                        <li key={item.applicantId} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                          <span className="font-semibold text-white">
                            #{item.rank} {applicantNameById[item.applicantId] || "Applicant"}
                          </span>
                          <p className="mt-1 text-slate-300">{item.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid gap-4">
                    <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Watchouts</p>
                      <ul className="mt-3 grid gap-2 text-sm text-slate-100">
                        {comparison.watchouts.map((item) => (
                          <li key={item} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-[24px] border border-white/8 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Recommended next step</p>
                      <p className="mt-3 text-sm leading-6 text-slate-100">{comparison.nextStep}</p>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <ApplicantList
              applicants={filteredApplicants}
              onEdit={(applicant) =>
                setEditingApplicant({
                  _id: applicant._id,
                  name: applicant.name,
                  email: applicant.email,
                  phone: applicant.phone,
                  propertyAddress: applicant.propertyAddress,
                  propertyCity: applicant.propertyCity,
                  propertyState: applicant.propertyState,
                  propertyPostalCode: applicant.propertyPostalCode,
                  moveInDate: applicant.moveInDate,
                  propertyAddressConfirmed: Boolean(applicant.propertyAddress),
                  coApplicants: applicant.coApplicants,
                  applicationSource: applicant.applicationSource as ApplicantFormValues["applicationSource"],
                  monthlyRent: applicant.monthlyRent,
                  monthlyIncome: applicant.monthlyIncome,
                  housingSupport: applicant.housingSupport,
                  supportProgram: applicant.supportProgram,
                  monthlySubsidyAmount: applicant.monthlySubsidyAmount,
                  tenantPortionRent: applicant.tenantPortionRent,
                  subsidyStatus: applicant.subsidyStatus,
                  inspectionStatus: applicant.inspectionStatus,
                  residentScore: applicant.residentScore,
                  rentalHistoryScore: applicant.scores.rentalHistory,
                  rulesComplianceScore: applicant.scores.rulesCompliance,
                  timelineScore: applicant.scores.timeline,
                  communicationScore: applicant.scores.communication,
                  documentationScore: applicant.scores.documentation,
                  notes: applicant.notes.join("\n"),
                  status: applicant.status
                })
              }
              onDelete={deleteApplicant}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
