import type { Metadata } from "next";
import {
  LightPageFrame,
  LightPanel,
} from "@/components/marketing/light-page-frame";

export const metadata: Metadata = {
  title: "About | RentNinja AI",
  description: "Learn what RentNinja AI helps property owners and managers do.",
};

const coreCards = [
  [
    "Compare applicants",
    "Keep every renter in one workspace and quickly see who looks strongest.",
  ],
  [
    "Catch risk early",
    "Surface affordability gaps, weak resident scores, and other warning signs before approval.",
  ],
  [
    "Stay organized",
    "Track notes, statuses, and decisions without juggling spreadsheets, texts, and email threads.",
  ],
];

const servedItems = [
  "Independent landlords screening a handful of applicants",
  "Property managers reviewing multiple renters across units",
  "Leasing teams that want a more consistent decision process",
];

const mattersItems = [
  "Speed without losing judgment",
  "A simple way to identify the best tenant in the bunch",
  "A professional workflow that can grow into a full leasing business tool",
];

export default function AboutPage() {
  return (
    <LightPageFrame>
      <LightPanel>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
          About RentNinja AI
        </p>
        <h1 className="mt-4 max-w-5xl text-[2.35rem] font-black leading-[1.02] tracking-tight text-[#070d24] md:text-5xl lg:text-[3.2rem]">
          Built to help landlords sort through applicants faster and pick the
          right tenant with more confidence.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[#364154]">
          RentNinja AI is designed for landlords, property managers, and leasing
          teams who need a cleaner way to compare renters, spot red flags, and
          keep leasing decisions organized from inquiry to approval.
        </p>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {coreCards.map(([title, body]) => (
            <div
              key={title}
              className="rounded-[22px] border border-[#dbe2ee] bg-white/88 p-5 shadow-[0_18px_40px_rgba(31,49,83,0.1)]"
            >
              <p className="text-base font-black text-[#071027]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[#364154]">{body}</p>
            </div>
          ))}
        </div>
      </LightPanel>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <InfoList title="Who It Serves" items={servedItems} />
        <InfoList title="What Matters" items={mattersItems} />
      </section>
    </LightPageFrame>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[24px] border border-[#dbe2ee] bg-white/82 p-6 shadow-[0_20px_48px_rgba(31,49,83,0.1)] backdrop-blur-xl">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff4f16]">
        {title}
      </p>
      <ul className="mt-4 grid gap-3 text-sm text-[#364154]">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl border border-[#dbe2ee] bg-white/88 px-4 py-3"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
