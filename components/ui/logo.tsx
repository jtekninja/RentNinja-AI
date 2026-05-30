import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
};

export function Logo({ href }: LogoProps) {
  const content = (
    <div className="inline-flex items-center gap-2.5">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
        <Image
          src="/rentninja_ai_logo2_transparent.png"
          alt="RentNinja AI logo"
          width={485}
          height={433}
          priority
          className="absolute left-1/2 top-0 h-auto w-[165%] max-w-none -translate-x-1/2"
        />
      </div>
      <div className="flex items-center gap-2">
        <p className="font-[var(--font-display)] text-2xl font-black italic tracking-tight text-[#0b1224] sm:text-3xl">
          Rent<span className="text-[#f0441a]">Ninja</span>
        </p>
        <span className="rounded-md border border-[#ff4b1f] px-1.5 py-0.5 text-xs font-bold text-[#ff4b1f]">
          AI
        </span>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} aria-label="Go to home page" className="inline-flex">
      {content}
    </Link>
  );
}
