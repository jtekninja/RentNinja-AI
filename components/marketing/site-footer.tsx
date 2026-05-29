import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 flex flex-col gap-4 border-t border-[#d7dfed] py-6 text-sm font-semibold text-[#364154] sm:flex-row sm:items-center sm:justify-between">
      <p>RentNinja AI by JTekNinja.com</p>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/about"
          className="inline-flex min-h-[44px] items-center transition hover:text-[#ff4f16]"
        >
          About
        </Link>
        <Link
          href="/contact"
          className="inline-flex min-h-[44px] items-center transition hover:text-[#ff4f16]"
        >
          Contact
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-[44px] items-center transition hover:text-[#ff4f16]"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="inline-flex min-h-[44px] items-center transition hover:text-[#ff4f16]"
        >
          Get started
        </Link>
      </div>
    </footer>
  );
}
