import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  href?: string;
  compact?: boolean;
  onClick?: () => void;
};

export function Logo({ href, compact = false, onClick }: LogoProps) {
  const content = (
    <div className="inline-flex min-w-0 max-w-full flex-shrink items-center gap-2 sm:gap-2.5">
      <div className={`${compact ? "h-9 w-9" : "h-10 w-10 sm:h-12 sm:w-12"} relative shrink-0 overflow-hidden rounded-full`}>
        <Image
          src="/rentninja_ai_logo2_transparent.png"
          alt="RentNinja AI logo"
          width={485}
          height={433}
          priority
          className="absolute left-1/2 top-0 h-auto w-[165%] max-w-none -translate-x-1/2"
        />
      </div>
      <div className="flex min-w-0 flex-shrink items-center gap-1.5 sm:gap-2">
        <p className={`${compact ? "text-xl" : "text-xl min-[390px]:text-2xl sm:text-3xl"} min-w-0 whitespace-nowrap font-[var(--font-display)] font-black italic tracking-tight text-[#0b1224]`}>
          Rent<span className="text-[#f0441a]">Ninja</span>
        </p>
        <span className="shrink-0 rounded-md border border-[#ff4b1f] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#ff4b1f] sm:text-xs">
          AI
        </span>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      aria-label="Go to home page"
      className="inline-flex min-w-0 max-w-full flex-shrink"
      onClick={onClick}
    >
      {content}
    </Link>
  );
}
