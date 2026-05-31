import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BrandBackground } from "@/components/ui/brand-background";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#e8eef6] text-[#071126]">
      {/* Micro-animation CSS style block */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
          100% { transform: translateY(0px); }
        }
        .animate-float {
          animation: float 4.5s ease-in-out infinite;
        }
        .hero-logo-art {
          background: transparent;
          border: 0;
          box-shadow: none;
          outline: 0;
          filter: none;
          mask-image: radial-gradient(circle at center, #000 0%, #000 68%, transparent 84%);
          -webkit-mask-image: radial-gradient(circle at center, #000 0%, #000 68%, transparent 84%);
        }
      `,
        }}
      />

      <div className="mx-auto min-h-screen w-full max-w-[1560px] px-4 py-4 sm:px-6 lg:px-7">
        <div className="overflow-hidden rounded-[28px] border border-[#dbe2ee] bg-white shadow-[0_30px_90px_rgba(33,52,92,0.12)]">
          <div className="relative isolate overflow-hidden px-5 pb-8 pt-4 sm:px-7 lg:px-8 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,250,255,0.94))]">
            <BrandBackground variant="public" priority />
            <SiteHeader />

            {/* HERO SECTION — two-column grid: copy left, visual right */}
            <section className="min-w-0 pb-8 pt-10 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)] lg:items-center lg:gap-10">
              {/* Left Column — Eyebrow, Headline, CTA only */}
              <div className="relative z-10 w-full min-w-0 max-w-[300px] overflow-visible min-[390px]:max-w-[318px] sm:max-w-full lg:max-w-[620px]">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
                  RentNinja AI
                </p>
                <h1 className="mt-4 max-w-full text-[2.05rem] font-black leading-[1.05] tracking-tight text-[#070d24] min-[390px]:text-[2.18rem] sm:text-5xl lg:text-[2.55rem] xl:text-[2.95rem]">
                  <span className="block sm:inline">Pick the strongest</span>{" "}
                  <span className="block sm:inline">rental applicant</span>{" "}
                  <span className="relative inline-block break-words text-[#ff4f16]">
                    faster
                    <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-[#ff4f16]" />
                  </span>
                  .
                </h1>
                <p className="mt-4 max-w-full text-base leading-7 text-[#364154] lg:max-w-[560px]">
                  RentNinja AI turns messy applications, messages, and documents
                  into ranked applicants, missing-document checklists,
                  owner-ready reports, and follow-up messages.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link
                    href="/register"
                    className="inline-flex min-h-[50px] items-center gap-3 rounded-2xl bg-[#ff4f16] px-6 text-base font-extrabold text-white shadow-[0_16px_30px_rgba(255,79,22,0.28)] transition hover:-translate-y-0.5"
                  >
                    Create Workspace
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#ff4f16]">
                      {"->"}
                    </span>
                  </Link>
                </div>

                <p className="mt-4 text-base text-[#182034]">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-extrabold text-[#ff4f16] hover:text-[#d9320d]"
                  >
                    Sign in {">"}
                  </Link>
                </p>
              </div>

              {/* Right Column — Hero Visual (contained city bg + ninja logo) */}
              <div className="relative z-0 mt-8 min-h-[420px] w-full max-w-[300px] overflow-hidden rounded-[24px] border border-[#dbe2ee] bg-white shadow-[0_20px_50px_rgba(31,49,83,0.06)] min-[390px]:max-w-[318px] sm:max-w-full lg:mt-0 lg:min-h-[520px]">
                {/* 1. Road/City Background Image (Contained inside this wrapper only) */}
                <Image
                  src="/rentninja_background1.png"
                  alt="RentNinja City Background"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="pointer-events-none object-cover opacity-95 z-0"
                  style={{
                    objectPosition: "center 72%",
                  }}
                />

                {/* 2. Seamless Gradients to blend the background edges cleanly */}
                {/* Left side soft fade */}
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
                {/* Bottom side soft fade */}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white via-white/60 to-transparent z-10 pointer-events-none" />
                {/* Top side soft fade */}
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />

                {/* 3. Floating Interactive Badges */}
                {/* Shield Badge - Upper Left */}
                <div className="absolute left-[12%] top-[14%] z-[25] grid h-14 w-14 place-items-center rounded-full border border-[#ffeedd] bg-white/94 text-[#ff4f16] shadow-[0_12px_32px_rgba(255,79,22,0.18)] backdrop-blur transition duration-300 hover:scale-105">
                  <ShieldIcon />
                </div>

                {/* 4. Large Floating Ninja / Logo Artwork */}
                <div className="absolute inset-0 z-20 grid place-items-center p-4">
                  <div className="hero-logo-art relative h-[340px] w-[340px] max-h-[90vw] max-w-[90vw] animate-float md:h-[420px] md:w-[420px]">
                    <Image
                      src="/rentninja_ai_logo_clean.png"
                      alt="RentNinja AI Logo"
                      fill
                      priority
                      sizes="(max-width: 768px) 90vw, 420px"
                      className="pointer-events-none select-none object-contain"
                      style={{
                        objectFit: "contain",
                        background: "transparent",
                        border: 0,
                        boxShadow: "none",
                        outline: 0,
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* FEATURE CARDS ROW — horizontal 3-col below hero */}
            <section className="grid gap-5 md:grid-cols-3 pb-8">
              <FeatureCard
                icon={<TrophyIcon />}
                title="Best tenant ranking"
                body="Ninja Decision Score and Applicant Readiness Meter show the strongest candidate and what is still missing."
              />
              <FeatureCard
                icon={<FlagIcon />}
                title="Messy Info Extractor"
                body="Paste texts, emails, screenshots, or applicant notes and turn them into a clean leasing profile."
              />
              <FeatureCard
                icon={<TrendIcon />}
                title="Owner-ready reports"
                body="Create professional summaries and follow-up messages without rewriting the same leasing work."
              />
            </section>

            <section className="grid gap-5 pb-8 lg:grid-cols-[0.9fr,1.1fr]">
              <div className="rounded-[24px] border border-[#dbe2ee] bg-white/88 p-6 shadow-[0_18px_40px_rgba(31,49,83,0.1)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff4f16]">
                  Why RentNinja AI is different
                </p>
                <h2 className="mt-3 text-3xl font-black text-[#071027]">
                  Built for messy real-world applicant info.
                </h2>
                <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-[#364154] sm:grid-cols-2">
                  {[
                    "Turns texts, screenshots, and notes into clean profiles",
                    "Shows the fastest ready candidate",
                    "Creates owner-ready reports",
                    "Generates professional follow-up messages",
                    "Helps users stay organized without spreadsheets",
                    "Uses Fair Housing Guardrails for safer decision support",
                  ].map((item) => (
                    <p
                      key={item}
                      className="rounded-2xl bg-[#f8fafc] px-4 py-3"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-[#dbe2ee] bg-white/88 p-6 shadow-[0_18px_40px_rgba(31,49,83,0.1)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff4f16]">
                  Demo workflow
                </p>
                <h2 className="mt-3 text-3xl font-black text-[#071027]">
                  From messy message to leasing decision in 60 seconds.
                </h2>
                <div className="mt-4 grid gap-2">
                  {[
                    "Paste applicant message",
                    "RentNinja extracts key details",
                    "AI finds missing documents",
                    "Ninja Decision Score ranks applicant",
                    "One-click follow-up message is ready",
                    "Owner report can be generated",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-[#dbe2ee] bg-white px-4 py-3 text-sm font-extrabold text-[#172033]"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ff4f16] text-white">
                        {index + 1}
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* DASHBOARD PREVIEW — pipeline snapshot + applicant decision */}
            <section className="rounded-[24px] border border-[#dbe2ee] bg-white/82 p-5 shadow-[0_20px_48px_rgba(31,49,83,0.1)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.16em] text-[#172033]">
                <PulseIcon />
                Live Pipeline Snapshot
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <SnapshotCard label="Strong" value="28" tone="text-emerald-600">
                  <Sparkline color="#10b981" />
                </SnapshotCard>
                <SnapshotCard label="Review" value="11" tone="text-[#1479e6]">
                  <Sparkline color="#1479e6" />
                </SnapshotCard>
                <SnapshotCard label="Risk" value="4" tone="text-rose-600">
                  <Sparkline color="#f43f5e" />
                </SnapshotCard>
              </div>

              <div className="mt-5 rounded-[20px] border border-[#dbe2ee] bg-white/85 p-5 shadow-[0_16px_36px_rgba(31,49,83,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.16em] text-[#172033]">
                      <UsersMiniIcon />
                      Applicant Decision
                    </div>
                    <h2 className="mt-4 text-3xl font-black text-[#071027]">
                      Nina Patel
                    </h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-5 py-3 text-base font-extrabold text-emerald-700">
                    <ShieldMiniIcon />
                    Strong
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <DecisionMetric
                    label="Total score"
                    value={
                      <>
                        <span className="text-[#ff4f16]">84</span> / 100
                      </>
                    }
                    icon={<ScoreRing />}
                  />
                  <DecisionMetric
                    label="Affordability"
                    value="3.6x rent"
                    icon={<CheckIcon />}
                    iconClassName="bg-emerald-100 text-emerald-600"
                  />
                  <DecisionMetric
                    label="Credit score"
                    value="742"
                    icon={<CardIcon />}
                    iconClassName="bg-blue-100 text-blue-600"
                  />
                  <DecisionMetric
                    label="Lease status"
                    value="Draft"
                    icon={<DocIcon />}
                    iconClassName="bg-orange-100 text-[#ff4f16]"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
        <SiteFooter />
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#dbe2ee] bg-white/88 p-5 shadow-[0_18px_40px_rgba(31,49,83,0.1)] backdrop-blur-xl">
      <div className="flex gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#fff0e8] text-[#ff4f16]">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-black text-[#071027]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#364154]">{body}</p>
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[88px] items-center justify-between rounded-[18px] border border-[#dbe2ee] bg-white/88 px-6 py-4 shadow-[0_12px_28px_rgba(31,49,83,0.07)]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4c596e]">
          {label}
        </p>
        <p className={`mt-1 text-3xl font-black ${tone}`}>{value}</p>
      </div>
      {children}
    </div>
  );
}

function DecisionMetric({
  label,
  value,
  icon,
  iconClassName = "bg-orange-100 text-[#ff4f16]",
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  iconClassName?: string;
}) {
  return (
    <div className="flex min-h-[86px] items-center justify-between rounded-2xl border border-[#dbe2ee] bg-white px-5 py-4 shadow-[0_10px_26px_rgba(31,49,83,0.07)]">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#172033]">
          {label}
        </p>
        <p className="mt-1 text-2xl font-black text-[#071027]">{value}</p>
      </div>
      <div
        className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${iconClassName}`}
      >
        {icon}
      </div>
    </div>
  );
}

function Sparkline({ color }: { color: string }) {
  return (
    <svg className="h-12 w-28" viewBox="0 0 112 48" aria-hidden="true">
      <path
        d="M8 38 L24 30 L38 34 L52 19 L66 24 L82 14 L104 8 L104 44 L8 44 Z"
        fill={color}
        opacity="0.12"
      />
      <path
        d="M8 38 L24 30 L38 34 L52 19 L66 24 L82 14 L104 8"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l7 3v5c0 4.4-2.7 7.8-7 10-4.3-2.2-7-5.6-7-10V6l7-3z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 4h8v4a4 4 0 01-8 0V4z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 6H4v2a4 4 0 004 4M16 6h4v2a4 4 0 01-4 4M12 12v5M8 21h8M10 17h4"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 21V4M6 5h11l-2 4 2 4H6"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function TrendIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M4 17l5-5 4 4 7-8" stroke="currentColor" strokeWidth="2" />
      <path d="M18 8h2v2" stroke="currentColor" strokeWidth="2" />
      <circle cx="4" cy="17" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="13" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg className="h-5 w-5 text-[#ff4f16]" viewBox="0 0 24 24" fill="none">
      <path d="M3 12h4l2-6 4 12 2-6h6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function UsersMiniIcon() {
  return (
    <svg className="h-5 w-5 text-[#ff4f16]" viewBox="0 0 24 24" fill="none">
      <path
        d="M8 11a3 3 0 100-6 3 3 0 000 6zM3 20a5 5 0 0110 0M16 12a3 3 0 100-6M14 20a5 5 0 017 0"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function ShieldMiniIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l7 3v5c0 4.4-2.7 7.8-7 10-4.3-2.2-7-5.6-7-10V6l7-3z"
        fill="currentColor"
      />
      <path d="M9 12l2 2 4-5" stroke="white" strokeWidth="2" />
    </svg>
  );
}

function ScoreRing() {
  return (
    <div className="grid h-12 w-12 place-items-center rounded-full border-[5px] border-[#ff8a3d] text-[10px] font-black text-[#071027]">
      84%
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="6"
        width="16"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M4 10h16M8 15h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h7l4 4v14H7V3z" stroke="currentColor" strokeWidth="2" />
      <path
        d="M14 3v5h5M10 13h5M10 17h5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}
