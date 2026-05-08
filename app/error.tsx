"use client";

import { useEffect } from "react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js App Router error boundary (page-level).
 *
 * Renders when an unexpected error bubbles up from a page or layout.
 * - In production, shows a generic message — no stack traces, no secrets.
 * - In development, shows the digest for debugging.
 * - Provides a "Try Again" button that calls reset().
 */
export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Server-side logging is handled by apiError() in route handlers and
    // by Next.js server logs. This log is for client-side observability only.
    if (process.env.NODE_ENV === "development") {
      console.error("Page error boundary caught:", error.message, error.digest);
    }
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0f14] px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-white mb-4">
          Something went wrong
        </h1>
        <p className="text-gray-400 mb-6">
          An unexpected error occurred while loading this page. Please try
          again.
        </p>
        {process.env.NODE_ENV === "development" && error.digest && (
          <p className="text-xs text-gray-600 mb-4 font-mono">
            Digest: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium
                     hover:bg-indigo-500 transition-colors"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
