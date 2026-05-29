"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Sign in" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex min-h-[68px] items-center justify-between gap-4 rounded-[22px] border border-[#dfe6f2] bg-white/92 px-5 py-3 shadow-[0_18px_48px_rgba(30,48,82,0.1)] backdrop-blur-xl">
      <Logo href="/" />
      <nav className="hidden items-center gap-8 text-sm font-bold text-[#080d1f] md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition hover:text-[#ff4f16]"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/register"
          className="inline-flex min-h-[46px] items-center gap-2 rounded-2xl bg-[#ff4f16] px-5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(255,79,22,0.28)] transition hover:-translate-y-0.5"
        >
          Get started
          <span aria-hidden="true">-&gt;</span>
        </Link>
      </nav>
      <button
        onClick={() => setMenuOpen(true)}
        className="-mr-2 flex min-h-[44px] min-w-[44px] items-center justify-center p-2 text-[#080d1f] hover:text-[#ff4f16] md:hidden"
        aria-label="Open menu"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog">
          <div
            className="absolute inset-0 bg-[#0b1224]/35 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="relative z-50 flex h-full w-72 flex-col overflow-y-auto border-r border-[#dfe6f2] bg-white p-4 shadow-[0_28px_80px_rgba(30,48,82,0.18)]">
            <div className="mb-6 flex items-center justify-between">
              <Logo href="/" />
              <button
                onClick={() => setMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 text-[#080d1f] hover:text-[#ff4f16]"
                aria-label="Close menu"
              >
                x
              </button>
            </div>
            <div className="space-y-1">
              {[...NAV_LINKS, { href: "/register", label: "Get started" }].map(
                (link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex min-h-[44px] items-center rounded-lg px-3 py-3 text-sm font-bold text-[#080d1f] hover:bg-[#fff1ec] hover:text-[#ff4f16]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
