import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { BrandBackground } from "@/components/ui/brand-background";

type LightPageFrameProps = {
  children: ReactNode;
};

export function LightPageFrame({ children }: LightPageFrameProps) {
  return (
    <main className="min-h-screen bg-[#eef4ff] text-[#081026]">
      <div className="mx-auto min-h-screen w-full max-w-[1560px] px-4 py-4 sm:px-6 lg:px-7">
        <div className="overflow-hidden rounded-[28px] border border-[#d7dfed] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,250,255,0.94))] shadow-[0_30px_90px_rgba(33,52,92,0.16)]">
          <div className="relative isolate min-h-[calc(100vh-2rem)] overflow-hidden px-5 pb-8 pt-4 sm:px-7 lg:px-8">
            <BrandBackground variant="public" priority />
            <SiteHeader />
            <div className="light-form-scope">{children}</div>
          </div>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}

export function LightPanel({ children }: { children: ReactNode }) {
  return (
    <section className="mt-8 rounded-[24px] border border-[#dbe2ee] bg-white/82 p-6 shadow-[0_20px_48px_rgba(31,49,83,0.1)] backdrop-blur-xl sm:p-8">
      {children}
    </section>
  );
}
