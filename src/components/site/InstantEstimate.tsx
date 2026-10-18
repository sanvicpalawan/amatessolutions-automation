"use client";

import { useMemo } from "react";

import { computeRoi, php } from "@/lib/roi";

/**
 * Live quote estimator. Runs the exact same ROI engine the backend agent uses,
 * entirely in the browser — the prospect sees a number before submitting and
 * the owner never has to price an enquiry by hand.
 */
export default function InstantEstimate({
  propertyType,
  location,
  energyUsageKwh,
  monthlyBillPhp,
  gridState,
}: {
  propertyType: string;
  location: string;
  energyUsageKwh: string;
  monthlyBillPhp: string;
  gridState: string;
}) {
  const roi = useMemo(
    () =>
      computeRoi({
        propertyType,
        gridState,
        energyUsageKwh,
        monthlyBillPhp,
      }),
    [propertyType, gridState, energyUsageKwh, monthlyBillPhp],
  );

  const ready = Number(energyUsageKwh) > 0 || Number(monthlyBillPhp) > 0;

  if (!ready) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Instant estimate
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Enter your monthly usage or bill and your system size, savings and payback appear here
          immediately — no waiting, no obligation.
        </p>
      </div>
    );
  }

  const metrics = [
    { label: "System size", value: `${roi.systemSizeKw} kWp`, sub: `+ ${roi.batteryKwh} kWh battery` },
    { label: "Monthly saving", value: php(roi.monthlySavingsPhp), sub: `${php(roi.annualSavingsPhp)} / year` },
    { label: "Payback", value: `${roi.paybackYears} yrs`, sub: "on turnkey investment" },
    {
      label: "25-yr net benefit",
      value: php(roi.twentyFiveYearSavingsPhp),
      sub: `~${roi.co2TonnesPerYear} t CO₂ avoided / yr`,
    },
  ];

  return (
    <div className="animate-rise rounded-2xl border border-solar-200 bg-gradient-to-br from-solar-50 to-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-solar-700">
          Instant estimate
        </p>
        <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-solar-300">
          Live
        </span>
      </div>

      <p className="mt-1.5 text-[11px] text-slate-500">
        Indicative sizing for {location || "Palawan"} · final design confirmed at your free audit.
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 rounded-xl bg-white p-3.5 shadow-sm">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {metric.label}
            </dt>
            <dd className="mt-0.5 text-[15px] font-extrabold leading-tight tabular-nums text-navy-900 sm:text-base">{metric.value}</dd>
            <dd className="text-[11px] text-slate-500">{metric.sub}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        Based on {roi.tariffPhpPerKwh.toFixed(2)} PHP/kWh for your grid state, 4.8 peak sun hours and
        marine-grade components. Estimates exclude incentives.
      </p>
    </div>
  );
}
