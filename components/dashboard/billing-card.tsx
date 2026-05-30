"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getPlan, planCatalog, type PlanKey } from "@/lib/saas-plans";

type BillingCardProps = {
  organizationName: string;
  plan: string;
  billingStatus: string;
  billingEnabled: boolean;
  hasBillingCustomer: boolean;
};

export function BillingCard({
  organizationName,
  plan,
  billingStatus,
  billingEnabled,
  hasBillingCustomer,
}: BillingCardProps) {
  const [pendingAction, setPendingAction] = useState<
    "checkout" | "portal" | null
  >(null);
  const [message, setMessage] = useState("");

  async function trigger(
    endpoint: "/api/billing/checkout" | "/api/billing/portal",
    type: "checkout" | "portal",
    targetPlan?: PlanKey,
  ) {
    setPendingAction(type);
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: targetPlan ? JSON.stringify({ plan: targetPlan }) : undefined,
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to open billing.");
        return;
      }

      if (data.demoMode) {
        setMessage(data.message || "Billing is running in demo mode.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setPendingAction(null);
    }
  }

  const currentPlan = getPlan(plan);
  const canOpenPortal = billingEnabled && hasBillingCustomer;
  const upgradePlans = (["starter", "pro", "business", "enterprise"] as PlanKey[]).filter(
    (item) => item !== currentPlan.key,
  );

  return (
    <section className="dashboard-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#ff4b1f]">
            Billing
          </p>
          <h3 className="mt-2 text-xl font-bold text-[#071126]">
            {organizationName}
          </h3>
          <p className="mt-1 text-sm font-medium leading-6 text-[#334155]">
            {!billingEnabled
              ? "Billing is in demo mode right now. Add Stripe keys and live price IDs to turn on real checkout and portal actions."
              : "Manage subscription status, applicant limits, and upgrades for this workspace."}
          </p>
        </div>
        <StatusPill tone={currentPlan.key !== "free" ? "strong" : "neutral"}>
          {currentPlan.name}
        </StatusPill>
      </div>

      <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <StatusPill tone={billingStatus === "active" ? "strong" : "review"}>
          {billingStatus}
        </StatusPill>
        {upgradePlans.map((upgradePlan) => (
          <Button
            key={upgradePlan}
            onClick={() =>
              trigger("/api/billing/checkout", "checkout", upgradePlan)
            }
            disabled={pendingAction === "checkout"}
          >
            {pendingAction === "checkout"
              ? "Opening..."
              : `Choose ${planCatalog[upgradePlan].name}`}
          </Button>
        ))}
        <Button
          variant="secondary"
          className="!border !border-[#94a3b8] !bg-white !text-[#071126] !ring-0 hover:!border-[#ff4b1f] hover:!bg-[#f8fafc] hover:!text-[#ff4b1f]"
          onClick={() => trigger("/api/billing/portal", "portal")}
          disabled={pendingAction === "portal" || !canOpenPortal}
        >
          {pendingAction === "portal"
            ? "Opening..."
            : canOpenPortal
              ? "Open Billing Portal"
              : "Billing portal unavailable"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Object.values(planCatalog)
          .map((item) => (
            <div
              key={item.key}
              className="rounded-[18px] border border-[#b8c4d4] bg-white p-4"
            >
              <p className="text-sm font-bold text-[#071126]">
                {item.name} · {item.priceLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#475569]">
                {item.applicantLimit
                  ? `${item.applicantLimit} applicants/month`
                  : "Unlimited applicants"}
              </p>
            </div>
          ))}
      </div>

      {message ? (
        <p className="mt-4 text-sm font-semibold text-amber-700">{message}</p>
      ) : null}
    </section>
  );
}
