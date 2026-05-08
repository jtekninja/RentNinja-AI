"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  if (process.env.NODE_ENV === "development") {
    console.error("Global error boundary caught:", error.message, error.digest);
  }

  return (
    <html lang="en">
      <body className="bg-[#0b0f14] text-white antialiased">
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              A critical error occurred. Please refresh the page to try again.
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
              Refresh
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
