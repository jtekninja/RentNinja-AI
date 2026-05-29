import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]",
        variant === "primary" &&
          "bg-[#ff4f16] text-white shadow-[0_14px_30px_rgba(255,79,22,0.26)]",
        variant === "secondary" &&
          "bg-white/10 text-white ring-1 ring-white/10",
        variant === "ghost" && "bg-transparent text-white ring-1 ring-white/10",
        variant === "danger" &&
          "bg-[#ff8b80]/12 text-[#ffc2bc] ring-1 ring-[#ff8b80]/20",
        className,
      )}
      {...props}
    />
  );
}
