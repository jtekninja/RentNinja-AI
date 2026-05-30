"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const customerTypes = [
  "Landlord",
  "Realtor",
  "Property Manager",
  "Property Owner",
  "Leasing Agent",
  "Real Estate Team",
];

const screeningStyles = ["Fast and simple", "Balanced", "Detailed review"];

export function OnboardingCard() {
  const [hidden, setHidden] = useState(true);
  const [step, setStep] = useState(0);
  const [customerType, setCustomerType] = useState("Landlord");
  const [screeningStyle, setScreeningStyle] = useState("Balanced");

  useEffect(() => {
    setHidden(localStorage.getItem("rentninja-onboarding-skipped") === "true");
  }, []);

  function skip() {
    localStorage.setItem("rentninja-onboarding-skipped", "true");
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-[#e8eef6] px-5 py-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#ff4b1f]">
          First-run setup
        </p>
        <h2 className="mt-1 text-xl font-bold text-[#050b1f]">
          Set up RentNinja in under a minute
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#475569]">
          You can skip this and start by pasting applicant info.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {step === 0 ? (
          <div>
            <h3 className="text-base font-bold text-[#071126]">
              Choose customer type
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {customerTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`min-h-[44px] rounded-2xl border px-4 py-2 text-sm font-bold ${
                    customerType === type
                      ? "border-[#ff4b1f] bg-[#fff0ea] text-[#d63a12]"
                      : "border-[#b8c4d4] bg-white text-[#071126]"
                  }`}
                  onClick={() => setCustomerType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div>
            <h3 className="text-base font-bold text-[#071126]">
              Add first property
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {["Property name", "Unit type", "Rent amount", "Pet policy"].map(
                (label) => (
                  <input
                    key={label}
                    className="dashboard-input"
                    placeholder={label}
                  />
                ),
              )}
              <select className="dashboard-input">
                <option>Utilities included?</option>
                <option>Yes</option>
                <option>No</option>
              </select>
              <select className="dashboard-input">
                <option>Smoking policy</option>
                <option>No smoking</option>
                <option>Smoking allowed where legal</option>
              </select>
              <textarea
                className="dashboard-input min-h-24 sm:col-span-2"
                placeholder="Required documents: photo ID, application form, pay stubs, bank statements..."
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h3 className="text-base font-bold text-[#071126]">
              Choose screening style
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {screeningStyles.map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`min-h-[44px] rounded-2xl border px-4 py-2 text-sm font-bold ${
                    screeningStyle === style
                      ? "border-[#ff4b1f] bg-[#fff0ea] text-[#d63a12]"
                      : "border-[#b8c4d4] bg-white text-[#071126]"
                  }`}
                  onClick={() => setScreeningStyle(style)}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h3 className="text-base font-bold text-[#071126]">
              Start first applicant
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Link className="field-action" href="/dashboard/ai#one-minute">
                Paste applicant info
              </Link>
              <Link className="field-action" href="/dashboard/new">
                Quick add manually
              </Link>
              <Link className="field-action" href="/dashboard/ai#extractor">
                Upload packet
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="btn-ghost text-sm" onClick={skip}>
            Skip for now
          </button>
          <div className="flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={() => setStep((current) => current - 1)}
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() =>
                step === 3 ? skip() : setStep((current) => current + 1)
              }
            >
              {step === 3 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
