"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Home", short: "H" },
  { href: "/dashboard/applicants", label: "Applicants", short: "A" },
  { href: "#add", label: "Add", short: "+" },
  { href: "/dashboard/ai", label: "AI", short: "AI" },
  { href: "/dashboard/settings", label: "Settings", short: "S" },
];

const addActions = [
  {
    href: "/dashboard/new",
    title: "Quick Add Applicant",
    description: "Enter the essentials in under a minute.",
  },
  {
    href: "/dashboard/ai#one-minute",
    title: "Paste Applicant Info",
    description: "Turn messy messages into a clean review.",
  },
  {
    href: "/dashboard/ai#extractor",
    title: "Upload Applicant Packet",
    description: "Stage screenshots, PDFs, or application text.",
  },
  {
    href: "/dashboard/messages",
    title: "Generate Follow-Up Message",
    description: "Create the next message and copy it fast.",
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {sheetOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog">
          <button
            type="button"
            aria-label="Close quick add actions"
            className="absolute inset-0 bg-[#071126]/35"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-3 bottom-24 rounded-[24px] border border-[#b8c4d4] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
                  Add
                </p>
                <h2 className="mt-1 text-xl font-black text-[#050b1f]">
                  What do you want to do?
                </h2>
              </div>
              <button
                type="button"
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-[#94a3b8] bg-white text-lg font-black text-[#071126]"
                onClick={() => setSheetOpen(false)}
              >
                x
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {addActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={() => setSheetOpen(false)}
                  className="min-h-[64px] rounded-2xl border border-[#b8c4d4] bg-[#f8fafc] px-4 py-3 text-left transition hover:border-[#ff4b1f] hover:bg-[#fff0ea]"
                >
                  <p className="text-sm font-black text-[#071126]">
                    {action.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-[#334155]">
                    {action.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#b8c4d4] bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-16px_36px_rgba(15,23,42,0.14)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end gap-1">
          {navItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : item.href !== "#add" && pathname?.startsWith(item.href);
            const isAdd = item.label === "Add";

            const className = `flex min-h-[52px] flex-col items-center justify-center rounded-2xl text-xs font-bold transition ${
              active
                ? "text-[#ff4b1f]"
                : "text-[#334155] hover:bg-[#fff0ea] hover:text-[#ff4b1f]"
            } ${isAdd ? "-mt-5" : ""}`;
            const inner = (
              <>
                <span
                  className={`flex h-9 min-w-9 items-center justify-center rounded-full border text-sm font-black ${
                    isAdd
                      ? "h-12 min-w-12 border-[#ff4b1f] bg-[#ff4b1f] text-white shadow-[0_10px_24px_rgba(255,75,31,0.3)]"
                      : active
                        ? "border-[#ff4b1f] bg-[#fff0ea]"
                        : "border-[#b8c4d4] bg-white"
                  }`}
                >
                  {item.short}
                </span>
                <span className="mt-1">{item.label}</span>
              </>
            );

            return isAdd ? (
              <button
                key={item.href}
                type="button"
                className={className}
                onClick={() => setSheetOpen(true)}
              >
                {inner}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[52px] flex-col items-center justify-center rounded-2xl text-xs font-bold transition ${
                  active
                    ? "text-[#ff4b1f]"
                    : "text-[#334155] hover:bg-[#fff0ea] hover:text-[#ff4b1f]"
                } ${isAdd ? "-mt-5" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
