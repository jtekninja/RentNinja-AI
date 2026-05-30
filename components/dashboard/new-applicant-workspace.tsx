"use client";

import { useState } from "react";
import {
  ApplicantForm,
  type ApplicantFormValues,
} from "@/components/dashboard/applicant-form";
import { WorkspacePageShell } from "@/components/dashboard/workspace-page-shell";

type NewApplicantWorkspaceProps = {
  defaultPropertyCity?: string;
  defaultPropertyState?: string;
  addressLookupEnabled: boolean;
};

export function NewApplicantWorkspace({
  defaultPropertyCity = "",
  defaultPropertyState = "",
  addressLookupEnabled,
}: NewApplicantWorkspaceProps) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function saveApplicant(values: ApplicantFormValues) {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to save applicant.");
        return false;
      }

      setMessage("Applicant created. You can add another applicant or return to the dashboard.");
      return true;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <WorkspacePageShell
      eyebrow="New Applicant"
      title="Quick add or full screening"
      description="Use the fast mobile flow for core details, or switch to the full screening form for deeper scoring and documentation review."
    >
      {message ? (
        <div className="rounded-[18px] border border-[#ffb89f] bg-[#fff0ea] p-4 text-sm font-bold text-[#b94114]">
          {message}
        </div>
      ) : null}
      <ApplicantForm
        submitting={submitting}
        onSubmit={saveApplicant}
        onCancelEdit={() => undefined}
        defaultPropertyCity={defaultPropertyCity}
        defaultPropertyState={defaultPropertyState}
        addressLookupEnabled={addressLookupEnabled}
      />
    </WorkspacePageShell>
  );
}
