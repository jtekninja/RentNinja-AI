import { Suspense } from "react";
import { ReportsClient } from "./reports-client";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#e8eef6]">
          <div className="dashboard-card p-8 text-center">
            <p className="text-sm font-semibold text-[#475569]">
              Loading reports...
            </p>
          </div>
        </div>
      }
    >
      <ReportsClient />
    </Suspense>
  );
}
