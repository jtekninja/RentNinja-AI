"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Get started" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-[30px] border border-white/10 bg-white/6 px-5 py-4">
      <Logo href="/" />
      <nav className="hidden md:flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-200">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <button
        onClick={() => setMenuOpen(true)}
        className="md:hidden p-2 -mr-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-200 hover:text-white"
        aria-label="Open menu"
      >
        <svg
          className="w-6 h-6"
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
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="relative z-50 w-64 h-full bg-[#11161e] border-r border-white/10 flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <Logo href="/" />
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-white min-h-[44px] min-w-[44px]"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white min-h-[44px] flex items-center"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
