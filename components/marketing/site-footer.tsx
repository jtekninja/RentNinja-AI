import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 flex flex-col gap-4 border-t border-white/10 py-6 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
      <p>RentNinja AI by JTekNinja.com</p>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/about"
          className="inline-flex items-center min-h-[44px] transition hover:text-white"
        >
          About
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center min-h-[44px] transition hover:text-white"
        >
          Contact
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center min-h-[44px] transition hover:text-white"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center min-h-[44px] transition hover:text-white"
        >
          Get started
        </Link>
      </div>
    </footer>
  );
}
