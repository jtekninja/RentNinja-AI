import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#eef4ff] text-[#081026]">
      <div className="mx-auto min-h-screen w-full max-w-[1560px] px-4 py-4 sm:px-6 lg:px-7">
        <div className="overflow-hidden rounded-[28px] border border-[#d7dfed] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,250,255,0.94))] shadow-[0_30px_90px_rgba(33,52,92,0.16)]">
          <div className="relative isolate min-h-[980px] overflow-hidden px-5 pb-8 pt-4 sm:px-7 lg:px-8">
            <Image
              src="/rentninja_background1.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="pointer-events-none -z-30 object-cover opacity-85"
              style={{ objectPosition: "center 58%" }}
            />
            <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.9)_34%,rgba(255,255,255,0.22)_62%,rgba(255,247,242,0.46)_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-[16%] -z-10 h-[420px] bg-[radial-gradient(ellipse_at_64%_68%,rgba(255,94,24,0.34)_0%,rgba(255,143,64,0.22)_22%,rgba(255,181,111,0.1)_38%,transparent_62%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-[34%] -z-10 hidden h-[220px] bg-[radial-gradient(ellipse_at_62%_55%,rgba(255,86,19,0.22)_0%,rgba(255,139,51,0.12)_34%,transparent_68%)] blur-sm lg:block" />

            <SiteHeader />

            <section className="relative grid gap-8 pb-5 pt-10 lg:min-h-[560px] lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
              <div className="pointer-events-none absolute bottom-[18px] left-[39%] right-[-4%] z-0 hidden h-[260px] overflow-hidden lg:block">
                <div
                  className="absolute inset-0 opacity-85"
                  style={{
                    backgroundImage: "url('/rentninja_background1.png')",
                    backgroundPosition: "center 72%",
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "980px auto",
                    maskImage:
                      "linear-gradient(90deg, transparent 0%, black 16%, black 78%, transparent 100%), linear-gradient(180deg, transparent 0%, black 22%, black 76%, transparent 100%)",
                    maskComposite: "intersect",
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent 0%, black 16%, black 78%, transparent 100%), linear-gradient(180deg, transparent 0%, black 22%, black 76%, transparent 100%)",
                    WebkitMaskComposite: "source-in",
                  }}
                />
                <div className="absolute inset-x-[8%] bottom-8 h-[120px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,79,22,0.34)_0%,rgba(255,157,77,0.18)_40%,transparent_72%)] blur-md" />
              </div>
              <div className="relative z-10 max-w-[620px]">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
                  RentNinja AI
                </p>
                <h1 className="mt-4 text-[2.35rem] font-black leading-[1.02] tracking-tight text-[#070d24] sm:text-5xl lg:text-[2.55rem] xl:text-[2.95rem]">
                  Automated tenant screening that helps landlords compare
                  applicants and choose the{" "}
                  <span className="relative inline-block text-[#ff4f16]">
                    best renter
                    <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-[#ff4f16]" />
                  </span>{" "}
                  with confidence.
                </h1>
                <p className="mt-4 max-w-[560px] text-base leading-7 text-[#364154]">
                  Score every applicant, rank the strongest tenants, flag risky
                  files, track status from lead to lease, and keep every
                  property team&apos;s records organized inside one mobile-ready
                  workspace.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-4">
                  <Link
                    href="/register"
                    className="inline-flex min-h-[50px] items-center gap-3 rounded-2xl bg-[#ff4f16] px-6 text-base font-extrabold text-white shadow-[0_16px_30px_rgba(255,79,22,0.28)] transition hover:-translate-y-0.5"
                  >
                    Create Workspace
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#ff4f16]">
                      -&gt;
                    </span>
                  </Link>
                </div>

                <p className="mt-4 text-base text-[#182034]">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-extrabold text-[#ff4f16] hover:text-[#d9320d]"
                  >
                    Sign in &gt;
                  </Link>
                </p>
              </div>

              <div className="relative z-0 min-h-[320px] lg:min-h-[500px]">
                <div className="absolute left-[6%] right-[4%] top-[42%] hidden h-[150px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,86,19,0.28)_0%,rgba(255,149,70,0.16)_34%,transparent_72%)] blur-xl lg:block" />
                <div className="absolute left-[6%] top-[2%] hidden h-16 w-16 place-items-center rounded-full bg-white/80 text-[#ff4f16] shadow-[0_18px_38px_rgba(31,49,83,0.13)] backdrop-blur md:grid">
                  <ShieldIcon />
                </div>
                <div className="absolute right-[5%] top-[34%] hidden h-16 w-16 place-items-center rounded-full bg-white/80 text-[#ff4f16] shadow-[0_18px_38px_rgba(31,49,83,0.13)] backdrop-blur md:grid">
                  <UsersIcon />
                </div>
                <div className="absolute left-1/2 top-[42%] h-[360px] w-[560px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden lg:h-[500px] lg:w-[760px]">
                  <Image
                    src="/rentninja_ai_logo2_transparent.png"
                    alt="RentNinja AI mark"
                    width={485}
                    height={433}
                    priority
                    className="absolute left-1/2 top-[-4%] h-auto w-[112%] max-w-none -translate-x-1/2 mix-blend-multiply drop-shadow-[0_32px_42px_rgba(74,35,22,0.24)]"
                    style={{
                      clipPath: "inset(0 0 37% 0)",
                      filter: "saturate(1.12) contrast(1.04)",
                      maskImage:
                        "radial-gradient(ellipse at 50% 38%, black 0%, black 54%, rgba(0,0,0,0.84) 64%, transparent 82%)",
                      WebkitMaskImage:
                        "radial-gradient(ellipse at 50% 38%, black 0%, black 54%, rgba(0,0,0,0.84) 64%, transparent 82%)",
                    }}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-3">
              <FeatureCard
                icon={<TrophyIcon />}
                title="Best tenant ranking"
                body="Automatically compare the whole applicant pool and push the strongest matches to the top."
              />
              <FeatureCard
                icon={<FlagIcon />}
                title="Red flag detection"
                body="Spot affordability problems, weak credit, and incomplete files before approving a lease."
              />
              <FeatureCard
                icon={<TrendIcon />}
                title="Status tracking"
                body="Move applicants from new lead to review, approval, and signed lease without losing the thread."
              />
            </section>

            <section className="mt-6 rounded-[24px] border border-[#dbe2ee] bg-white/82 p-5 shadow-[0_20px_48px_rgba(31,49,83,0.1)] backdrop-blur-xl">
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

function UsersIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
      <path d="M8 11a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
      <path d="M16 11a3 3 0 100-6 3 3 0 000 6z" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20a5 5 0 0110 0" stroke="currentColor" strokeWidth="2" />
      <path d="M11 20a5 5 0 0110 0" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M8 4h8v4a4 4 0 01-8 0V4z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 6H4v2a4 4 0 004 4M16 6h4v2a4 4 0 01-4 4M12 12v5M8 21h8M10 17h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M6 21V4M6 5h11l-2 4 2 4H6" stroke="currentColor" strokeWidth="2" />
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
      <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM3 20a5 5 0 0110 0M16 12a3 3 0 100-6M14 20a5 5 0 017 0" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ShieldMiniIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l7 3v5c0 4.4-2.7 7.8-7 10-4.3-2.2-7-5.6-7-10V6l7-3z" fill="currentColor" />
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
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M4 10h16M8 15h4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none">
      <path d="M7 3h7l4 4v14H7V3z" stroke="currentColor" strokeWidth="2" />
      <path d="M14 3v5h5M10 13h5M10 17h5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
