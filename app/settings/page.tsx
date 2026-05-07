"use client";

import { useState } from "react";

const TRADE_VERTICALS = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Roofing",
  "Cleaning",
  "Landscaping",
];

const US_MARKETS = [
  "Atlanta, GA",
  "Houston, TX",
  "Dallas, TX",
  "Phoenix, AZ",
  "Charlotte, NC",
  "Nashville, TN",
];

type SaveState = "idle" | "saving" | "saved";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-8 py-8 border-b border-gray-200 last:border-0">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="col-span-2 space-y-5">
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function SettingsPage() {
  const [form, setForm] = useState({
    firstName: "Alex",
    lastName: "Johnson",
    email: "alex@buckheadhvac.com",
    companyName: "Buckhead HVAC Services",
    trade: "HVAC",
    market: "Atlanta, GA",
    bio: "Residential and light commercial HVAC serving the greater Atlanta metro area for 8+ years. Specializing in heat pump installs and system replacements.",
    website: "buckheadhvac.com",
    phone: "(404) 555-0182",
  });

  const [saveState, setSaveState] = useState<SaveState>("idle");

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaveState("idle");
  }

  async function save() {
    setSaveState("saving");
    await new Promise((r) => setTimeout(r, 900));
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 3000);
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your account and company profile.</p>
        </div>
        <button
          onClick={save}
          disabled={saveState === "saving"}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            saveState === "saved"
              ? "bg-green-100 text-green-700"
              : saveState === "saving"
              ? "bg-blue-400 text-white cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {saveState === "saving" && (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          {saveState === "saved" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Account */}
      <Section
        title="Account"
        description="Your personal login details."
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name">
            <input className={inputClass} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
          </Field>
          <Field label="Last Name">
            <input className={inputClass} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
          </Field>
        </div>
        <Field label="Email">
          <input className={inputClass} type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </Field>
      </Section>

      {/* Company Profile */}
      <Section
        title="Company Profile"
        description="Used to personalize community discovery and post drafts."
      >
        <Field label="Company Name">
          <input className={inputClass} value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Trade Vertical"
            hint="Controls which communities are surfaced in discovery."
          >
            <select
              className={inputClass}
              value={form.trade}
              onChange={(e) => update("trade", e.target.value)}
            >
              {TRADE_VERTICALS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Market"
            hint="Locked to Atlanta for MVP. Multi-market support in Phase 2."
          >
            <select
              className={`${inputClass} text-gray-400 cursor-not-allowed`}
              value={form.market}
              disabled
            >
              {US_MARKETS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field
          label="Company Bio"
          hint="Included in AI-generated post introductions to personalize drafts."
        >
          <textarea
            className={`${inputClass} resize-none`}
            rows={3}
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Website">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="flex items-center px-3 bg-gray-50 text-xs text-gray-400 border-r border-gray-200 shrink-0">https://</span>
              <input
                className="flex-1 px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none"
                value={form.website}
                placeholder="yourcompany.com"
                onChange={(e) => update("website", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Phone">
            <input className={inputClass} type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Referral Link */}
      <Section
        title="Referral Link"
        description="Your unique TradeEngage referral link, embedded in homeowner post drafts."
      >
        <Field label="Your Referral URL">
          <div className="flex gap-2">
            <input
              className={`${inputClass} flex-1 bg-gray-50 text-gray-500 cursor-default`}
              value="tradeengage.com/ref/alex-johnson-hvac"
              readOnly
            />
            <button
              onClick={() => navigator.clipboard.writeText("https://tradeengage.com/ref/alex-johnson-hvac")}
              className="px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            UTM parameters are appended automatically per community when drafts are generated.
          </p>
        </Field>
      </Section>

      {/* Danger zone */}
      <Section
        title="Danger Zone"
        description="Irreversible actions — proceed with care."
      >
        <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 bg-red-50">
          <div>
            <p className="text-sm font-medium text-red-800">Clear all discovered communities</p>
            <p className="text-xs text-red-600 mt-0.5">Removes all results. You can re-run discovery at any time.</p>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors shrink-0 ml-6">
            Clear Data
          </button>
        </div>
      </Section>
    </div>
  );
}
