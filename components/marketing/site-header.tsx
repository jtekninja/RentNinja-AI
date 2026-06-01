"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Sign in" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const mobileLinks = [...NAV_LINKS, { href: "/register", label: "Get started" }];
  const closeMenu = () => {
    setMenuOpen(false);
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <header className="relative z-[90] flex min-h-[64px] w-full max-w-full items-center justify-between gap-3 overflow-visible rounded-[22px] border border-[#b8c4d4] bg-white/95 px-3 py-3 shadow-[0_4px_16px_rgba(7,17,38,0.06)] backdrop-blur-xl sm:min-h-[68px] sm:px-5">
      <div className="min-w-0 max-w-[calc(100%-3.5rem)] flex-shrink">
        <Logo href="/" />
      </div>
      <nav className="hidden items-center gap-6 text-sm font-bold text-[#071126] md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition hover:text-[#ff4b1f]"
          >
            {link.label}
          </Link>
        ))}
        <Link href="/register" className="btn-primary !rounded-xl text-sm">
          Get started
        </Link>
      </nav>
      <details
        ref={menuRef}
        className="contents md:hidden"
        onToggle={(event) => setMenuOpen(event.currentTarget.open)}
      >
        <summary
          className="flex min-h-[44px] min-w-[44px] list-none items-center justify-center rounded-xl border border-[#dfe6f2] bg-white p-2 text-[#080d1f] shadow-[0_8px_20px_rgba(7,17,38,0.06)] hover:text-[#ff4f16] [&::-webkit-details-marker]:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-site-menu"
          role="button"
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </summary>
        <div
          className="fixed inset-0 z-[100] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div
            className="absolute inset-0 bg-[#0b1224]/20"
            onClick={closeMenu}
          />
          <nav
            id="mobile-site-menu"
            className="fixed left-4 right-4 top-[6.75rem] z-[101] max-h-[calc(100dvh-7.75rem)] overflow-y-auto rounded-[22px] border border-[#b8c4d4] bg-white p-4 shadow-[0_28px_80px_rgba(30,48,82,0.22)]"
          >
            <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
              <div className="min-w-0">
                <Logo href="/" compact onClick={closeMenu} />
              </div>
              <button
                onClick={closeMenu}
                className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-xl border border-[#dfe6f2] text-xl font-black text-[#080d1f] hover:text-[#ff4f16]"
                aria-label="Close menu"
              >
                x
              </button>
            </div>
            <div className="grid gap-2">
              {mobileLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex min-h-[48px] items-center rounded-xl px-4 py-3 text-base font-bold ${
                    link.label === "Get started"
                      ? "bg-[#ff4b1f] text-white shadow-[0_12px_24px_rgba(255,75,31,0.22)]"
                      : "bg-[#f8fafc] text-[#080d1f] hover:bg-[#fff1ec] hover:text-[#ff4f16]"
                  }`}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </details>
    </header>
  );
}
