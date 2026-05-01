import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 flex flex-col gap-4 border-t border-white/10 py-6 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
      <p>RentNinja AI by JTekNinja.com</p>
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/about" className="transition hover:text-white">
          About
        </Link>
        <Link href="/contact" className="transition hover:text-white">
          Contact
        </Link>
        <Link href="/login" className="transition hover:text-white">
          Sign in
        </Link>
        <Link href="/register" className="transition hover:text-white">
          Get started
        </Link>
      </div>
    </footer>
  );
}
