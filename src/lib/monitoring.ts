import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/db";
import { systems, type SystemRow } from "@/db/schema";
import { ensureSeedData } from "@/lib/seed";

export type MonitoredSystem = {
  id: number;
  siteName: string;
  location: string;
  propertyType: string;
  capacityKw: number;
  batteryKwh: number;
  status: "online" | "warning" | "offline";
  wifiConnected: boolean;
  uptimePct: number;
  warrantyYears: number;
  commissionedAt: string;
  telemetry: {
    producingKw: number;
    todayKwh: number;
    batterySoc: number;
    gridExportKw: number;
    lastPing: string;
    alert: string | null;
  };
};

/** Deterministic pseudo-random telemetry so cards look live without a device fleet. */
function wiggle(seed: number, spread: number): number {
  const x = Math.sin(seed) * 10000;
  return (x - Math.floor(x)) * spread;
}

/** Palawan local clock (UTC+8) drives the daylight curve, not the server TZ. */
function manilaHour(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour + minute / 60;
}

function simulate(row: SystemRow): MonitoredSystem {
  const now = new Date();
  const hour = manilaHour(now);
  const capacity = Number(row.capacityKw);
  const battery = Number(row.batteryKwh);
  const seed = row.id * 97 + now.getDate();

  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
  const cloudFactor = 0.75 + wiggle(seed, 0.25);
  const offline = row.status === "offline" || !row.wifiConnected;

  const producingKw = offline ? 0 : Number((capacity * daylight * cloudFactor).toFixed(2));
  const todayKwh = offline
    ? 0
    : Number((capacity * 4.8 * 0.8 * Math.min(1, hour / 18) * cloudFactor).toFixed(1));
  const batterySoc = offline
    ? 0
    : Math.round(Math.min(100, 42 + daylight * 55 + wiggle(seed + 3, 8)));
  const gridExportKw = offline ? 0 : Number(Math.max(0, producingKw - capacity * 0.45).toFixed(2));

  const alert = offline
    ? row.wifiConnected
      ? "Inverter unreachable — site visit queued"
      : "WIFI offline at site — monitoring paused (client-provided link required)"
    : row.status === "warning"
      ? "String 2 underperforming by 11% — cleaning scheduled"
      : null;

  return {
    id: row.id,
    siteName: row.siteName,
    location: row.location,
    propertyType: row.propertyType,
    capacityKw: capacity,
    batteryKwh: battery,
    status: (row.status as MonitoredSystem["status"]) ?? "online",
    wifiConnected: row.wifiConnected,
    uptimePct: Number(row.uptimePct),
    warrantyYears: row.warrantyYears,
    commissionedAt: row.commissionedAt.toISOString(),
    telemetry: {
      producingKw,
      todayKwh,
      batterySoc,
      gridExportKw,
      lastPing: offline
        ? new Date(now.getTime() - 1000 * 60 * 47).toISOString()
        : new Date(now.getTime() - 1000 * 30).toISOString(),
      alert,
    },
  };
}

export async function listMonitoredSystems(): Promise<MonitoredSystem[]> {
  await ensureSeedData();
  const rows = await db.select().from(systems).orderBy(asc(systems.siteName));
  return rows.map(simulate);
}

export function fleetSummary(fleet: MonitoredSystem[]) {
  const totalKw = fleet.reduce((sum, s) => sum + s.capacityKw, 0);
  const producing = fleet.reduce((sum, s) => sum + s.telemetry.producingKw, 0);
  const todayKwh = fleet.reduce((sum, s) => sum + s.telemetry.todayKwh, 0);
  return {
    sites: fleet.length,
    online: fleet.filter((s) => s.status === "online").length,
    warning: fleet.filter((s) => s.status === "warning").length,
    offline: fleet.filter((s) => s.status === "offline").length,
    totalKw: Number(totalKw.toFixed(2)),
    producingKw: Number(producing.toFixed(2)),
    todayKwh: Number(todayKwh.toFixed(1)),
  };
}
