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

    const signInResult = await signIn("credentials", {
      identifier: form.email.trim().toLowerCase(),
      password: form.password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (signInResult?.error) {
      setError("Workspace created, but automatic sign-in failed. Please sign in.");
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-semibold text-[#364154]">
        Your name
        <input
          className="auth-field rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-base text-[#071027] outline-none transition placeholder:text-[#7b8494] focus:border-[#ff4f16]"
          value={form.name}
          onChange={(event) =>
            setForm((current) => ({ ...current, name: event.target.value }))
          }
          placeholder="Jordan Rivera"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-[#364154]">
        Organization
        <input
          className="auth-field rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-base text-[#071027] outline-none transition placeholder:text-[#7b8494] focus:border-[#ff4f16]"
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

      <label className="grid gap-2 text-sm font-semibold text-[#364154]">
        Email
        <input
          className="auth-field rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-base text-[#071027] outline-none transition placeholder:text-[#7b8494] focus:border-[#ff4f16]"
          type="email"
          value={form.email}
          onChange={(event) =>
            setForm((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="owner@riveraproperties.com"
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-[#364154]">
        <div className="flex items-center justify-between gap-3">
          <span>Password</span>
          <button
            type="button"
            className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16] transition hover:text-[#d9320d]"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <input
          className="auth-field rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-base text-[#071027] outline-none transition placeholder:text-[#7b8494] focus:border-[#ff4f16]"
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

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating workspace..." : "Create workspace"}
      </Button>
    </form>
  );
}
