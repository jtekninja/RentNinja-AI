import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function ForRealtorsPage() {
  return (
    <main className="min-h-screen bg-[#eaf0f7] px-4 py-6 text-[#071126] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Logo />
        <section className="py-12">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#d63a12]">
            For realtors
          </p>
          <h1 className="mt-3 text-4xl font-black text-[#050b1f]">
            Turn applicant details into owner-ready summaries.
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-[#334155]">
            Compare candidates, generate owner updates, and send follow-up
            messages without wrestling with spreadsheets from a showing.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex min-h-[44px] rounded-full bg-[#ff4b1f] px-6 py-3 text-sm font-bold text-white hover:bg-[#e63e16]"
          >
            Start trial
          </Link>
        </section>
      </div>
    </main>
  );
}
