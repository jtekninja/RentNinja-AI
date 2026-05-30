import Image from "next/image";

type BrandBackgroundProps = {
  variant?: "public" | "dashboard";
  priority?: boolean;
};

export function BrandBackground({
  variant = "public",
  priority = false,
}: BrandBackgroundProps) {
  const isDashboard = variant === "dashboard";

  return (
    <>
      <Image
        src="/rentninja_background1.png"
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className={`pointer-events-none -z-20 object-cover ${
          isDashboard
            ? "object-bottom opacity-30 sm:opacity-[0.38]"
            : "object-center opacity-70"
        }`}
      />
      <div
        className={`absolute inset-0 -z-10 pointer-events-none ${
          isDashboard
            ? "bg-[linear-gradient(90deg,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.9)_42%,rgba(255,255,255,0.84)_70%,rgba(255,255,255,0.92)_100%)]"
            : "bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.92)_34%,rgba(255,255,255,0.36)_62%,rgba(255,255,255,0.74)_100%)]"
        }`}
      />
      <div
        className={`absolute inset-x-0 top-0 -z-10 h-48 pointer-events-none ${
          isDashboard
            ? "bg-gradient-to-b from-[#e8eef6] via-white/82 to-transparent"
            : "bg-gradient-to-b from-white/80 to-transparent"
        }`}
      />
    </>
  );
}
