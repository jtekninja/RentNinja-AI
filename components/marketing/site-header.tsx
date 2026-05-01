import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-[30px] border border-white/10 bg-white/6 px-5 py-4">
      <Logo href="/" />
      <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-200">
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
      </nav>
    </header>
  );
}
