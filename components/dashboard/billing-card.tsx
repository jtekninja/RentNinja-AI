"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

type BillingCardProps = {
  organizationName: string;
  plan: string;
  billingStatus: string;
  billingEnabled: boolean;
  hasBillingCustomer: boolean;
};

export function BillingCard({ organizationName, plan, billingStatus, billingEnabled, hasBillingCustomer }: BillingCardProps) {
  const [pendingAction, setPendingAction] = useState<"checkout" | "portal" | null>(null);
  const [message, setMessage] = useState("");

  async function trigger(endpoint: "/api/billing/checkout" | "/api/billing/portal", type: "checkout" | "portal") {
    setPendingAction(type);
    setMessage("");

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to open billing.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setPendingAction(null);
    }
  }

  const isProPlan = plan === "pro";
  const canUpgrade = billingEnabled && !isProPlan;
  const canOpenPortal = billingEnabled && hasBillingCustomer;

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">Billing</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{organizationName}</h3>
          <p className="mt-1 text-sm text-slate-300">
            {!billingEnabled
              ? "Billing is in demo mode right now. Add Stripe keys and a live price ID to turn on real checkout and portal actions."
              : isProPlan
                ? "This workspace is already marked as Pro. There are not separate Pro-only product features wired yet."
                : "This workspace is on Starter. When Stripe is configured, you can upgrade it to Pro from here."}
          </p>
        </div>
        <StatusPill tone={plan === "pro" ? "strong" : "neutral"}>{plan}</StatusPill>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusPill tone={billingStatus === "active" ? "strong" : "review"}>{billingStatus}</StatusPill>
        {!isProPlan ? (
          <Button onClick={() => trigger("/api/billing/checkout", "checkout")} disabled={pendingAction === "checkout" || !canUpgrade}>
            {pendingAction === "checkout" ? "Opening..." : "Upgrade to Pro"}
          </Button>
        ) : (
          <Button disabled variant="secondary">
            Pro plan active
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => trigger("/api/billing/portal", "portal")}
          disabled={pendingAction === "portal" || !canOpenPortal}
        >
          {pendingAction === "portal" ? "Opening..." : canOpenPortal ? "Open Billing Portal" : "Billing portal unavailable"}
        </Button>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-300">
        <p>`Starter` and `Pro` are currently billing labels, not different app capabilities.</p>
        <p>`Pro` becomes meaningful once Stripe-backed subscriptions and entitlement rules are fully connected.</p>
      </div>

      {message ? <p className="mt-4 text-sm text-amber-100">{message}</p> : null}
    </section>
  );
}
