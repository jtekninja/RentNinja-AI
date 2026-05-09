"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    organizationName: "",
    email: "",
    password: "",
  });
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.message || "Registration failed.");
      setPending(false);
      return;
    }

    await signIn("credentials", {
      email: form.email,
      password: form.password,
      callbackUrl: "/dashboard",
    });

    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm text-slate-200">
        Your name
        <input
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-[#f7b36d]/60"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="Jordan Rivera"
          required
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-200">
        Organization
        <input
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-[#f7b36d]/60"
          value={form.organizationName}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              organizationName: event.target.value,
            }))
          }
          placeholder="Rivera Property Group"
          required
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-200">
        Email
        <input
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-[#f7b36d]/60"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="owner@riveraproperties.com"
          required
        />
      </label>

      <label className="grid gap-2 text-sm text-slate-200">
        <div className="flex items-center justify-between gap-3">
          <span>Password</span>
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:text-white"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <input
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition focus:border-[#f7b36d]/60"
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={(event) =>
            setForm((current) => ({ ...current, password: event.target.value }))
          }
          placeholder="At least 8 characters"
          minLength={8}
          required
        />
      </label>

      {error ? <p className="text-sm text-rose-200">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating workspace..." : "Create workspace"}
      </Button>
    </form>
  );
}
