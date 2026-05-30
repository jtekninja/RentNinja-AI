"use client";

import Link from "next/link";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { Logo } from "@/components/ui/logo";
import { BrandBackground } from "@/components/ui/brand-background";

type WorkspacePageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function WorkspacePageShell({
  eyebrow,
  title,
  description,
  children,
}: WorkspacePageShellProps) {
  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-[#e8eef6] px-4 py-5 pb-28 text-[#071126] sm:px-6 lg:px-8 lg:pb-8">
      <BrandBackground variant="dashboard" />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5">
        <header className="card p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <Logo />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
                  {eyebrow}
                </p>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#334155]">
                  {description}
                </p>
              </div>
            </div>
            <Link href="/dashboard" className="btn-secondary w-full text-sm sm:w-auto">
              Back to dashboard
            </Link>
          </div>
        </header>
        {children}
      </div>
      <MobileBottomNav />
    </main>
  );
}
