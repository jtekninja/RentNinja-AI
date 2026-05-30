"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AiErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AI tools error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e8eef6] px-4 text-[#071126]">
      <div className="card max-w-md p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
          AI Tools
        </p>
        <h1 className="mt-2 text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-[#475569]">
          The AI tools page couldn't load. This may be a temporary issue.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={reset} className="btn-primary text-sm">
            Try again
          </button>
          <Link href="/dashboard" className="btn-secondary text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
