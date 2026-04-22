"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

type BillingCardProps = {
  organizationName: string;
  plan: string;
  billingStatus: string;
};

export function BillingCard({ organizationName, plan, billingStatus }: BillingCardProps) {
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

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">Billing Architecture</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{organizationName}</h3>
          <p className="mt-1 text-sm text-slate-300">
            Stripe upgrade flow is wired and ready for your real product and portal IDs.
          </p>
        </div>
        <StatusPill tone={plan === "pro" ? "strong" : "neutral"}>{plan}</StatusPill>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusPill tone={billingStatus === "active" ? "strong" : "review"}>{billingStatus}</StatusPill>
        <Button onClick={() => trigger("/api/billing/checkout", "checkout")} disabled={pendingAction === "checkout"}>
          {pendingAction === "checkout" ? "Opening..." : "Upgrade to Pro"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => trigger("/api/billing/portal", "portal")}
          disabled={pendingAction === "portal"}
        >
          {pendingAction === "portal" ? "Opening..." : "Open Billing Portal"}
        </Button>
      </div>

      {message ? <p className="mt-4 text-sm text-amber-100">{message}</p> : null}
    </section>
  );
}

