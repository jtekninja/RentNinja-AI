"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const normalizedIdentifier = identifier.trim().toLowerCase();

    const result = await signIn("credentials", {
      identifier: normalizedIdentifier,
      password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setError("Invalid email or password.");
      setPending(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="grid gap-2 text-sm font-semibold text-[#364154]">
        Email or username
        <input
          className="auth-field rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-base text-[#071027] outline-none transition placeholder:text-[#7b8494] focus:border-[#ff4f16]"
          type="text"
          placeholder="akeso80 or owner@rentninja.ai"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          spellCheck={false}
          inputMode="email"
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
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="current-password"
          spellCheck={false}
          required
        />
      </label>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
