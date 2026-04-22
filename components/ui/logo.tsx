import Image from "next/image";

export function Logo() {
  return (
    <div className="inline-flex items-center gap-3 sm:gap-4">
      <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-[#080b12] shadow-[0_14px_30px_rgba(0,0,0,0.28)] sm:h-[4.5rem] sm:w-[4.5rem]">
        <Image
          src="/jtekninja-logo.png"
          alt="JTekNinja logo"
          width={1254}
          height={1254}
          priority
          className="absolute left-1/2 top-0 h-auto w-[115%] max-w-none -translate-x-1/2 object-cover object-top"
        />
      </div>
      <div className="min-w-0">
        <p className="font-[var(--font-display)] text-xl font-semibold uppercase tracking-[0.12em] text-white sm:text-2xl">
          <span className="text-[#ff9b1a]">JTek</span>Ninja
        </p>
        <p className="text-[10px] uppercase tracking-[0.34em] text-[#f7b36d] sm:text-xs">
          Build • Automate • Dominate
        </p>
      </div>
    </div>
  );
}
