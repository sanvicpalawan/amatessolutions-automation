"use client";

import SectionLabel from "@/components/site/SectionLabel";
import SplitHeading from "@/components/site/SplitHeading";
import { useState } from "react";

import InstantEstimate from "@/components/site/InstantEstimate";
import { GRID_STATES, PALAWAN_LOCATIONS, PROPERTY_TYPES, TIMELINES } from "@/lib/knowledge";
import { Icon } from "@/lib/icons";
import type { SiteContent } from "@/lib/site";

type FormState = {
  contactName: string;
  contactEmail: string;
  contactWhatsapp: string;
  propertyType: string;
  location: string;
  energyUsageKwh: string;
  monthlyBillPhp: string;
  gridState: string;
  timeline: string;
  notes: string;
};

const EMPTY: FormState = {
  contactName: "",
  contactEmail: "",
  contactWhatsapp: "",
  propertyType: "residential",
  location: "Puerto Princesa",
  energyUsageKwh: "",
  monthlyBillPhp: "",
  gridState: "unstable",
  timeline: "planned",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-navy-900 outline-none transition placeholder:text-slate-400 focus:border-solar-400 focus:ring-4 focus:ring-solar-400/15";

const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800";

export default function IntakeForm({ content }: { content: SiteContent }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const update = (key: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setErrors({});
    setMessage("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrors(payload.errors ?? {});
        setStatus("error");
        setMessage(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("done");
      const estimate = payload.estimate as
        | { systemSizeKw: number; monthlySavingsPhp: number; paybackYears: number }
        | undefined;
      setMessage(
        estimate
          ? `${payload.message as string} Instant estimate: ~${estimate.systemSizeKw} kWp, about PHP ${estimate.monthlySavingsPhp.toLocaleString("en-PH")}/month saved, payback ~${estimate.paybackYears} years. A free audit has been requested for you.`
          : (payload.message as string),
      );
      setForm(EMPTY);
    } catch {
      setStatus("error");
      setMessage("Network error — please check your connection and retry.");
    }
  }

  return (
    <section id="quote" className="bg-[var(--brand-surface-muted)] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
          <div className="lg:pt-6">
            <SectionLabel index="06">{content.quoteEyebrow}</SectionLabel>
            <SplitHeading className="mt-6 text-h2 font-bold text-navy-900" lines={[content.quoteTitle]} />
            <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
              Tell us about your property and energy usage. The more detail you give, the sharper
              the quote. Our team reviews every submission, contacts you by WhatsApp and email, and
              sends a personalised solar proposal — free of charge and with no obligation.
            </p>

            <ul className="mt-7 space-y-3">
              {content.quotePerks.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-navy-800">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-solar-400 text-navy-950">
                    <Icon name="Check" className="h-3 w-3" strokeWidth={3.4} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] leading-relaxed text-slate-500">
                {content.quoteNote}
              </p>
            </div>
          </div>

          <form
            onSubmit={submit}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-navy-900/5 sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="contactName">
                  Name *
                </label>
                <input
                  id="contactName"
                  className={inputClass}
                  placeholder="Your first and last name"
                  value={form.contactName}
                  onChange={(e) => update("contactName")(e.target.value)}
                  required
                />
                {errors.contactName ? (
                  <p className="mt-1 text-xs text-red-600">{errors.contactName}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="propertyType">
                  Property type *
                </label>
                <select
                  id="propertyType"
                  className={inputClass}
                  value={form.propertyType}
                  onChange={(e) => update("propertyType")(e.target.value)}
                >
                  {PROPERTY_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="location">
                  Location in Palawan *
                </label>
                <select
                  id="location"
                  className={inputClass}
                  value={form.location}
                  onChange={(e) => update("location")(e.target.value)}
                >
                  {PALAWAN_LOCATIONS.map((place) => (
                    <option key={place} value={place}>
                      {place}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="energyUsageKwh">
                  Monthly usage (kWh)
                </label>
                <input
                  id="energyUsageKwh"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="e.g. 450"
                  value={form.energyUsageKwh}
                  onChange={(e) => update("energyUsageKwh")(e.target.value)}
                />
                {errors.energyUsageKwh ? (
                  <p className="mt-1 text-xs text-red-600">{errors.energyUsageKwh}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="monthlyBillPhp">
                  Monthly bill (PHP)
                </label>
                <input
                  id="monthlyBillPhp"
                  inputMode="decimal"
                  className={inputClass}
                  placeholder="e.g. 6500"
                  value={form.monthlyBillPhp}
                  onChange={(e) => update("monthlyBillPhp")(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="gridState">
                  Grid state *
                </label>
                <select
                  id="gridState"
                  className={inputClass}
                  value={form.gridState}
                  onChange={(e) => update("gridState")(e.target.value)}
                >
                  {GRID_STATES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="timeline">
                  Timeline
                </label>
                <select
                  id="timeline"
                  className={inputClass}
                  value={form.timeline}
                  onChange={(e) => update("timeline")(e.target.value)}
                >
                  {TIMELINES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="contactWhatsapp">
                  WhatsApp number *
                </label>
                <input
                  id="contactWhatsapp"
                  className={inputClass}
                  placeholder="+63 917 000 0000"
                  value={form.contactWhatsapp}
                  onChange={(e) => update("contactWhatsapp")(e.target.value)}
                  required
                />
                {errors.contactWhatsapp ? (
                  <p className="mt-1 text-xs text-red-600">{errors.contactWhatsapp}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass} htmlFor="contactEmail">
                  Email
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  className={inputClass}
                  placeholder="you@email.com"
                  value={form.contactEmail}
                  onChange={(e) => update("contactEmail")(e.target.value)}
                />
                {errors.contactEmail ? (
                  <p className="mt-1 text-xs text-red-600">{errors.contactEmail}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="notes">
                  Anything else we should know?
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  className={inputClass}
                  placeholder="Appliances, generator hours, roof type, deployment timeline…"
                  value={form.notes}
                  onChange={(e) => update("notes")(e.target.value)}
                />
              </div>
            </div>

            <InstantEstimate
              propertyType={form.propertyType}
              location={form.location}
              energyUsageKwh={form.energyUsageKwh}
              monthlyBillPhp={form.monthlyBillPhp}
              gridState={form.gridState}
            />

            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-7 w-full rounded-full bg-navy-900 px-8 py-4 text-xs font-bold uppercase tracking-wider text-white transition hover:-translate-y-0.5 hover:bg-solar-500 hover:text-navy-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Get my free quote"}
            </button>

            {message ? (
              <p
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  status === "done"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {message}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
