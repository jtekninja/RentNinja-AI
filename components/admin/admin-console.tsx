"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate, formatDateTime } from "@/lib/utils";
import { applicationSourceValues } from "@/lib/validators";

type AdminConsoleProps = {
  workspace: {
    _id: string;
    name: string;
    slug: string;
    plan: string;
    billingStatus: string;
    createdAt: string;
    businessProfile: {
      legalName: string;
      supportEmail: string;
      supportPhone: string;
      website: string;
    };
    complianceSettings: {
      defaultPropertyCity: string;
      defaultPropertyState: string;
      useClearBackgroundChecksAsPositiveSignal: boolean;
      allowCriminalHistoryScoreImpact: boolean;
      allowRegistryScoreImpact: boolean;
      allowOfacScoreImpact: boolean;
      requireManualReviewForConsumerReportFindings: boolean;
    };
    screeningPolicy: {
      minAffordabilityRatio: number;
      minResidentScore: number;
      strongScoreThreshold: number;
      reviewScoreThreshold: number;
      requireIncomeDocs: boolean;
      requireGovernmentId: boolean;
      requireLandlordReference: boolean;
    };
    intakeSettings: {
      enabledSources: string[];
      duplicatePolicy: "block" | "warn";
    };
  };
  stats: {
    applicants: number;
    strong: number;
    review: number;
    risk: number;
    teamMembers: number;
  };
  users: Array<{
    _id: string;
    name: string;
    email: string;
    username: string;
    role: "owner" | "member";
    createdAt: string;
  }>;
  activity: Array<{
    _id: string;
    action: string;
    entityType: string;
    entityId: string;
    level: "info" | "warning" | "error";
    message: string;
    actorName: string;
    actorEmail: string;
    createdAt: string;
  }>;
  currentUserId: string;
};

export function AdminConsole({ workspace, stats, users: initialUsers, activity, currentUserId }: AdminConsoleProps) {
  const [users, setUsers] = useState(initialUsers);
  const [workspaceState, setWorkspaceState] = useState(workspace);
  const [workspaceForm, setWorkspaceForm] = useState({
    name: workspace.name,
    businessProfile: workspace.businessProfile,
    complianceSettings: workspace.complianceSettings,
    screeningPolicy: workspace.screeningPolicy,
    intakeSettings: workspace.intakeSettings
  });
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [workspacePending, setWorkspacePending] = useState(false);
  const [teamMessage, setTeamMessage] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "member" as "owner" | "member"
  });
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [resetPasswordById, setResetPasswordById] = useState<Record<string, string>>({});
  const [showResetPasswordById, setShowResetPasswordById] = useState<Record<string, boolean>>({});
  const [pendingById, setPendingById] = useState<Record<string, boolean>>({});

  async function updateWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkspacePending(true);
    setWorkspaceMessage("");

    try {
      const response = await fetch("/api/admin/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workspaceForm)
      });
      const data = await response.json();

      if (!response.ok) {
        setWorkspaceMessage(data.message || "Unable to update workspace.");
        return;
      }

      setWorkspaceState((current) => ({ ...current, ...data }));
      setWorkspaceForm((current) => ({ ...current, ...data }));
      setWorkspaceMessage("Workspace updated.");
    } finally {
      setWorkspacePending(false);
    }
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingUser(true);
    setTeamMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      const data = await response.json();

      if (!response.ok) {
        setTeamMessage(data.message || "Unable to create user.");
        return;
      }

      setUsers((current) => [...current, data]);
      setNewUser({ name: "", email: "", username: "", password: "", role: "member" });
      setTeamMessage("Team member added.");
    } finally {
      setCreatingUser(false);
    }
  }

  async function updateUser(id: string, payload: { role?: "owner" | "member"; password?: string }, successMessage: string) {
    setPendingById((current) => ({ ...current, [id]: true }));
    setTeamMessage("");

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        setTeamMessage(data.message || "Unable to update user.");
        return;
      }

      setUsers((current) => current.map((user) => (user._id === id ? data : user)));
      setResetPasswordById((current) => ({ ...current, [id]: "" }));
      setTeamMessage(successMessage);
    } finally {
      setPendingById((current) => ({ ...current, [id]: false }));
    }
  }

  async function removeUser(id: string) {
    setPendingById((current) => ({ ...current, [id]: true }));
    setTeamMessage("");

    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        setTeamMessage(data.message || "Unable to remove user.");
        return;
      }

      setUsers((current) => current.filter((user) => user._id !== id));
      setTeamMessage("Team member removed.");
    } finally {
      setPendingById((current) => ({ ...current, [id]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(247,179,109,0.14),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(92,174,255,0.12),transparent_24%),linear-gradient(180deg,#10131a_0%,#0b0e13_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="rounded-[34px] border border-white/10 bg-white/6 px-5 py-5 shadow-[0_24px_70px_rgba(0,0,0,0.26)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-5">
              <Logo href="/" />
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#f7b36d]">Admin Console</p>
                <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Manage workspace settings, team access, passwords, and business controls.
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard">
                <Button variant="secondary" type="button">Back to dashboard</Button>
              </Link>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[0.85fr,1.15fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">Workspace</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Business settings</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <AdminStat label="Applicants" value={String(stats.applicants)} />
              <AdminStat label="Team members" value={String(stats.teamMembers)} />
              <AdminStat label="Enabled sources" value={String(workspaceState.intakeSettings.enabledSources.length)} />
              <AdminStat label="Strong" value={String(stats.strong)} />
              <AdminStat label="Review" value={String(stats.review)} />
              <AdminStat label="Risk" value={String(stats.risk)} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <AdminStat label="Plan" value={workspaceState.plan} />
              <AdminStat label="Billing" value={workspaceState.billingStatus} />
              <AdminStat label="Slug" value={workspaceState.slug} />
              <AdminStat label="Created" value={formatDate(workspaceState.createdAt)} />
            </div>

            <form className="mt-5 grid gap-4" onSubmit={updateWorkspace}>
              <label className="grid gap-2 text-sm text-slate-200">
                <span>Workspace name</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-[#f7b36d]/60"
                  value={workspaceForm.name}
                  onChange={(event) => setWorkspaceForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <div className="grid gap-4 rounded-[24px] border border-white/8 bg-black/15 p-4 lg:grid-cols-2">
                <p className="lg:col-span-2 text-xs uppercase tracking-[0.22em] text-[#f7b36d]">Business profile</p>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Legal / business name</span>
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.businessProfile.legalName} onChange={(event) => setWorkspaceForm((current) => ({ ...current, businessProfile: { ...current.businessProfile, legalName: event.target.value } }))} />
                </label>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Support email</span>
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.businessProfile.supportEmail} onChange={(event) => setWorkspaceForm((current) => ({ ...current, businessProfile: { ...current.businessProfile, supportEmail: event.target.value } }))} />
                </label>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Support phone</span>
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.businessProfile.supportPhone} onChange={(event) => setWorkspaceForm((current) => ({ ...current, businessProfile: { ...current.businessProfile, supportPhone: event.target.value } }))} />
                </label>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Website</span>
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.businessProfile.website} onChange={(event) => setWorkspaceForm((current) => ({ ...current, businessProfile: { ...current.businessProfile, website: event.target.value } }))} />
                </label>
              </div>
              <div className="grid gap-4 rounded-[24px] border border-white/8 bg-black/15 p-4 lg:grid-cols-2">
                <p className="lg:col-span-2 text-xs uppercase tracking-[0.22em] text-[#f7b36d]">Jurisdiction and compliance</p>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Default property city</span>
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.complianceSettings.defaultPropertyCity} onChange={(event) => setWorkspaceForm((current) => ({ ...current, complianceSettings: { ...current.complianceSettings, defaultPropertyCity: event.target.value } }))} />
                </label>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Default property state</span>
                  <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.complianceSettings.defaultPropertyState} onChange={(event) => setWorkspaceForm((current) => ({ ...current, complianceSettings: { ...current.complianceSettings, defaultPropertyState: event.target.value } }))} />
                </label>
                <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <ToggleCard
                    label="Use clear background checks as positive signal"
                    checked={workspaceForm.complianceSettings.useClearBackgroundChecksAsPositiveSignal}
                    onToggle={() =>
                      setWorkspaceForm((current) => ({
                        ...current,
                        complianceSettings: {
                          ...current.complianceSettings,
                          useClearBackgroundChecksAsPositiveSignal: !current.complianceSettings.useClearBackgroundChecksAsPositiveSignal
                        }
                      }))
                    }
                  />
                  <ToggleCard
                    label="Allow criminal history score impact"
                    checked={workspaceForm.complianceSettings.allowCriminalHistoryScoreImpact}
                    onToggle={() =>
                      setWorkspaceForm((current) => ({
                        ...current,
                        complianceSettings: {
                          ...current.complianceSettings,
                          allowCriminalHistoryScoreImpact: !current.complianceSettings.allowCriminalHistoryScoreImpact
                        }
                      }))
                    }
                  />
                  <ToggleCard
                    label="Allow registry score impact"
                    checked={workspaceForm.complianceSettings.allowRegistryScoreImpact}
                    onToggle={() =>
                      setWorkspaceForm((current) => ({
                        ...current,
                        complianceSettings: {
                          ...current.complianceSettings,
                          allowRegistryScoreImpact: !current.complianceSettings.allowRegistryScoreImpact
                        }
                      }))
                    }
                  />
                  <ToggleCard
                    label="Allow OFAC score impact"
                    checked={workspaceForm.complianceSettings.allowOfacScoreImpact}
                    onToggle={() =>
                      setWorkspaceForm((current) => ({
                        ...current,
                        complianceSettings: {
                          ...current.complianceSettings,
                          allowOfacScoreImpact: !current.complianceSettings.allowOfacScoreImpact
                        }
                      }))
                    }
                  />
                  <ToggleCard
                    label="Require manual review for consumer-report findings"
                    checked={workspaceForm.complianceSettings.requireManualReviewForConsumerReportFindings}
                    onToggle={() =>
                      setWorkspaceForm((current) => ({
                        ...current,
                        complianceSettings: {
                          ...current.complianceSettings,
                          requireManualReviewForConsumerReportFindings: !current.complianceSettings.requireManualReviewForConsumerReportFindings
                        }
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 rounded-[24px] border border-white/8 bg-black/15 p-4 lg:grid-cols-2">
                <p className="lg:col-span-2 text-xs uppercase tracking-[0.22em] text-[#f7b36d]">Screening policy</p>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Minimum affordability ratio</span>
                  <input type="number" step="0.1" min="1" max="10" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.screeningPolicy.minAffordabilityRatio} onChange={(event) => setWorkspaceForm((current) => ({ ...current, screeningPolicy: { ...current.screeningPolicy, minAffordabilityRatio: Number(event.target.value) } }))} />
                </label>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Minimum resident score</span>
                  <input type="number" min="0" max="850" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.screeningPolicy.minResidentScore} onChange={(event) => setWorkspaceForm((current) => ({ ...current, screeningPolicy: { ...current.screeningPolicy, minResidentScore: Number(event.target.value) } }))} />
                </label>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Strong threshold</span>
                  <input type="number" min="1" max="100" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.screeningPolicy.strongScoreThreshold} onChange={(event) => setWorkspaceForm((current) => ({ ...current, screeningPolicy: { ...current.screeningPolicy, strongScoreThreshold: Number(event.target.value) } }))} />
                </label>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Review threshold</span>
                  <input type="number" min="1" max="100" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={workspaceForm.screeningPolicy.reviewScoreThreshold} onChange={(event) => setWorkspaceForm((current) => ({ ...current, screeningPolicy: { ...current.screeningPolicy, reviewScoreThreshold: Number(event.target.value) } }))} />
                </label>
                <div className="lg:col-span-2 grid gap-3 sm:grid-cols-3">
                  <ToggleCard
                    label="Require income docs"
                    checked={workspaceForm.screeningPolicy.requireIncomeDocs}
                    onToggle={() =>
                      setWorkspaceForm((current) => ({
                        ...current,
                        screeningPolicy: {
                          ...current.screeningPolicy,
                          requireIncomeDocs: !current.screeningPolicy.requireIncomeDocs
                        }
                      }))
                    }
                  />
                  <ToggleCard
                    label="Require government ID"
                    checked={workspaceForm.screeningPolicy.requireGovernmentId}
                    onToggle={() =>
                      setWorkspaceForm((current) => ({
                        ...current,
                        screeningPolicy: {
                          ...current.screeningPolicy,
                          requireGovernmentId: !current.screeningPolicy.requireGovernmentId
                        }
                      }))
                    }
                  />
                  <ToggleCard
                    label="Require landlord reference"
                    checked={workspaceForm.screeningPolicy.requireLandlordReference}
                    onToggle={() =>
                      setWorkspaceForm((current) => ({
                        ...current,
                        screeningPolicy: {
                          ...current.screeningPolicy,
                          requireLandlordReference: !current.screeningPolicy.requireLandlordReference
                        }
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-4 rounded-[24px] border border-white/8 bg-black/15 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-[#f7b36d]">Intake controls</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {applicationSourceValues.map((source) => {
                    const enabled = workspaceForm.intakeSettings.enabledSources.includes(source);
                    return (
                      <button
                        key={source}
                        type="button"
                        onClick={() =>
                          setWorkspaceForm((current) => ({
                            ...current,
                            intakeSettings: {
                              ...current.intakeSettings,
                              enabledSources: enabled
                                ? current.intakeSettings.enabledSources.filter((item) => item !== source)
                                : [...current.intakeSettings.enabledSources, source]
                            }
                          }))
                        }
                        className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                          enabled
                            ? "border-[#f7b36d]/40 bg-[#f7b36d]/10 text-white"
                            : "border-white/10 bg-white/5 text-slate-300"
                        }`}
                      >
                        {source}
                      </button>
                    );
                  })}
                </div>
                <label className="grid gap-2 text-sm text-slate-200">
                  <span>Duplicate handling</span>
                  <select className="w-full rounded-2xl border border-white/10 bg-[#12161e] px-4 py-3 text-base text-white outline-none" value={workspaceForm.intakeSettings.duplicatePolicy} onChange={(event) => setWorkspaceForm((current) => ({ ...current, intakeSettings: { ...current.intakeSettings, duplicatePolicy: event.target.value as "block" | "warn" } }))}>
                    <option value="block">Block duplicates</option>
                    <option value="warn">Warn only</option>
                  </select>
                </label>
              </div>
              <Button type="submit" disabled={workspacePending}>
                {workspacePending ? "Saving..." : "Save admin settings"}
              </Button>
            </form>

            {workspaceMessage ? <p className="mt-4 text-sm text-amber-100">{workspaceMessage}</p> : null}
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">Team Access</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Accounts and passwords</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Add staff, assign owner or member access, reset passwords, and remove inactive accounts from the workspace.
            </p>

            <form className="mt-5 grid gap-4 rounded-[24px] border border-white/8 bg-black/15 p-4 lg:grid-cols-2" onSubmit={createUser}>
              <label className="grid gap-2 text-sm text-slate-200">
                <span>Name</span>
                <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={newUser.name} onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm text-slate-200">
                <span>Email</span>
                <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm text-slate-200">
                <span>Username</span>
                <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none" value={newUser.username} onChange={(event) => setNewUser((current) => ({ ...current, username: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <span>Temporary password</span>
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:text-white"
                    onClick={() => setShowNewUserPassword((current) => !current)}
                  >
                    {showNewUserPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showNewUserPassword ? "text" : "password"}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none"
                  value={newUser.password}
                  onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-200 lg:col-span-2">
                <span>Role</span>
                <select className="w-full rounded-2xl border border-white/10 bg-[#12161e] px-4 py-3 text-base text-white outline-none" value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as "owner" | "member" }))}>
                  <option value="member">Member</option>
                  <option value="owner">Owner</option>
                </select>
              </label>
              <div className="lg:col-span-2">
                <Button type="submit" disabled={creatingUser}>{creatingUser ? "Creating..." : "Add team member"}</Button>
              </div>
            </form>

            {teamMessage ? <p className="mt-4 text-sm text-amber-100">{teamMessage}</p> : null}

            <div className="mt-5 grid gap-4">
              {users.map((user) => (
                <article key={user._id} className="rounded-[24px] border border-white/8 bg-black/15 p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">{user.name}</h3>
                        <StatusPill tone={user.role === "owner" ? "strong" : "neutral"}>{user.role}</StatusPill>
                        {user._id === currentUserId ? <StatusPill tone="review">You</StatusPill> : null}
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{user.email}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {user.username ? `@${user.username} | ` : ""}Created {formatDate(user.createdAt)}
                      </p>
                    </div>

                    <div className="grid w-full gap-4 xl:max-w-[560px]">
                      <div className="grid gap-2">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Permissions</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <select
                            className="rounded-2xl border border-white/10 bg-[#12161e] px-4 py-3 text-sm text-white outline-none sm:min-w-[180px]"
                            value={user.role}
                            onChange={(event) => updateUser(user._id, { role: event.target.value as "owner" | "member" }, "Role updated.")}
                            disabled={pendingById[user._id] || user._id === currentUserId}
                          >
                            <option value="owner">Owner</option>
                            <option value="member">Member</option>
                          </select>
                          <p className="text-sm text-slate-400 sm:self-center">
                            {user._id === currentUserId ? "You cannot change your own role here." : "Change this user’s workspace access level."}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Password</p>
                        <input
                          type={showResetPasswordById[user._id] ? "text" : "password"}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                          placeholder="Enter a new password"
                          value={resetPasswordById[user._id] || ""}
                          onChange={(event) => setResetPasswordById((current) => ({ ...current, [user._id]: event.target.value }))}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              setShowResetPasswordById((current) => ({ ...current, [user._id]: !current[user._id] }))
                            }
                          >
                            {showResetPasswordById[user._id] ? "Hide password" : "Show password"}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pendingById[user._id] || !(resetPasswordById[user._id] || "").trim()}
                            onClick={() => updateUser(user._id, { password: resetPasswordById[user._id] }, "Password reset.")}
                          >
                            Save new password
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            disabled={pendingById[user._id] || user._id === currentUserId}
                            onClick={() => removeUser(user._id)}
                          >
                            Remove user
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[#f7b36d]">Activity log</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">User and system events</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Recent user actions, applicant changes, duplicate blocks, AI events, and system issues across this workspace.
          </p>
          <div className="mt-5 grid gap-3">
            {activity.length > 0 ? (
              activity.map((entry) => (
                <article key={entry._id} className="rounded-[24px] border border-white/8 bg-black/15 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={entry.level === "error" ? "risk" : entry.level === "warning" ? "review" : "neutral"}>
                          {entry.level}
                        </StatusPill>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                          {entry.action.replaceAll(".", " ")}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-100">{entry.message}</p>
                      <p className="mt-2 text-sm text-slate-400">
                        {entry.actorName || "System"}{entry.actorEmail ? ` (${entry.actorEmail})` : ""} • {entry.entityType}
                      </p>
                    </div>
                    <div className="text-sm text-slate-400">{formatDateTime(entry.createdAt)}</div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-[24px] border border-white/8 bg-black/15 px-4 py-4 text-sm text-slate-300">
                No activity has been logged yet for this workspace.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/15 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ToggleCard({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-2xl border px-4 py-4 text-left transition ${
        checked ? "border-emerald-300/20 bg-emerald-300/10" : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className={`mt-2 text-xs uppercase tracking-[0.22em] ${checked ? "text-emerald-100" : "text-slate-400"}`}>
        {checked ? "Required" : "Optional"}
      </p>
    </button>
  );
}
