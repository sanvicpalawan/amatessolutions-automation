"use client";

import { useEffect, useState } from "react";

import type { MonitoredSystem } from "@/lib/monitoring";

type Summary = {
  sites: number;
  online: number;
  warning: number;
  offline: number;
  totalKw: number;
  producingKw: number;
  todayKwh: number;
};

const STATUS_DOT: Record<string, string> = {
  online: "bg-emerald-500 pulse-green",
  warning: "bg-amber-500",
  offline: "bg-red-500",
};

export default function MonitoringCards({
  initialSystems,
  initialSummary,
}: {
  initialSystems: MonitoredSystem[];
  initialSummary: Summary;
}) {
  const [systems, setSystems] = useState(initialSystems);
  const [summary, setSummary] = useState(initialSummary);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    setUpdatedAt(new Date().toLocaleTimeString("en-PH"));
    const timer = setInterval(async () => {
      const response = await fetch("/api/systems", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { systems: MonitoredSystem[]; summary: Summary };
      setSystems(payload.systems);
      setSummary(payload.summary);
      setUpdatedAt(new Date().toLocaleTimeString("en-PH"));
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Monitored sites", value: summary.sites, hint: `${summary.totalKw} kWp fleet` },
          { label: "Online", value: summary.online, hint: `${summary.producingKw} kW right now` },
          { label: "Warnings", value: summary.warning, hint: "Needs attention" },
          { label: "Offline", value: summary.offline, hint: "Dispatch or WIFI issue" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {stat.label}
            </p>
            <p className="mt-1.5 text-2xl font-extrabold text-navy-900">{stat.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{stat.hint}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-slate-500">
        Telemetry simulated from the <code className="rounded bg-slate-100 px-1">systems</code>{" "}
        table · auto-refresh every 20s {updatedAt ? `· last update ${updatedAt}` : ""}
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {systems.map((system) => (
          <article
            key={system.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-navy-900">{system.siteName}</h3>
                <p className="text-[11px] text-slate-500">
                  {system.location} · {system.capacityKw} kWp · {system.batteryKwh} kWh
                </p>
              </div>
              <span className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[system.status]}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {system.status}
                </span>
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Now", value: `${system.telemetry.producingKw} kW` },
                { label: "Today", value: `${system.telemetry.todayKwh} kWh` },
                { label: "Battery", value: `${system.telemetry.batterySoc}%` },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-navy-900">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-solar-300 to-solar-500 transition-all duration-700"
                style={{
                  width: `${Math.min(100, (system.telemetry.producingKw / Math.max(system.capacityKw, 1)) * 100)}%`,
                }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider">
              <span
                className={`rounded-full px-2 py-1 font-bold ${
                  system.wifiConnected
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                WIFI {system.wifiConnected ? "linked" : "down"}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600">
                {system.uptimePct}% uptime
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600">
                {system.warrantyYears} yr warranty
              </span>
            </div>

            {system.telemetry.alert ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800">
                {system.telemetry.alert}
              </p>
            ) : (
              <p className="mt-3 text-[11px] text-slate-500">
                All strings nominal · last ping{" "}
                {new Date(system.telemetry.lastPing).toLocaleTimeString("en-PH")}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
