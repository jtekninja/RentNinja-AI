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
        "inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-3 text-sm font-bold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-80",
        variant === "primary" &&
          "bg-[#ff4b1f] text-white shadow-[0_16px_34px_rgba(255,75,31,0.34)] hover:bg-[#e63e16]",
        variant === "secondary" &&
          "border border-[#94a3b8] bg-white text-[#071126] shadow-[0_8px_18px_rgba(15,23,42,0.08)] ring-0 hover:bg-[#f8fafc]",
        variant === "ghost" &&
          "border border-[#94a3b8] bg-transparent text-[#071126] ring-0 hover:bg-[#fff0ea]",
        variant === "danger" &&
          "border border-rose-300 bg-rose-50 text-[#dc2626] ring-0 hover:bg-rose-100",
        className,
      )}
      {...props}
    />
  );
}
