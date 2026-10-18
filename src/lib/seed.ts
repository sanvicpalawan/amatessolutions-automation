import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { appointments, leads, systems } from "@/db/schema";

let seeded = false;

function daysFromNow(days: number, hour = 9): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/** Idempotent demo seed so the backoffice is never an empty shell. */
export async function ensureSeedData(): Promise<void> {
  if (seeded) return;
  seeded = true;

  const [leadCount] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(leads);
  const [systemCount] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(systems);
  const [appointmentCount] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(appointments);

  if (leadCount.count > 0 && systemCount.count > 0 && appointmentCount.count > 0) return;

  const inserted = leadCount.count > 0
    ? await db.select({ id: leads.id, name: leads.contactName, location: leads.location }).from(leads)
    : await db
    .insert(leads)
    .values([
      {
        contactName: "Ruby W.",
        contactEmail: "ruby@islandresort.ph",
        contactWhatsapp: "+639171234567",
        propertyType: "commercial",
        location: "Linapacan",
        energyUsageKwh: "2850.00",
        monthlyBillPhp: "79800.00",
        gridState: "off_grid",
        timeline: "immediate",
        notes: "Island resort, 7.3 KW off-grid system damaged by typhoon Tino. Needs rapid repair.",
        sourceChannel: "whatsapp",
        status: "won",
      },
      {
        contactName: "Marco Dela Cruz",
        contactEmail: "marco.dc@gmail.com",
        contactWhatsapp: "+639182223344",
        propertyType: "residential",
        location: "Puerto Princesa",
        energyUsageKwh: "420.00",
        monthlyBillPhp: "5400.00",
        gridState: "unstable",
        timeline: "planned",
        notes: "Two aircon units, work-from-home setup, daily brownouts.",
        sourceChannel: "web_form",
        status: "new",
      },
      {
        contactName: "Seabreeze Dive Co.",
        contactEmail: "ops@seabreezedive.ph",
        contactWhatsapp: "+639209887766",
        propertyType: "industrial_marine",
        location: "Coron",
        energyUsageKwh: "6400.00",
        monthlyBillPhp: "178000.00",
        gridState: "generator",
        timeline: "immediate",
        notes: "Compressor bank + ice plant running on diesel 14h/day.",
        sourceChannel: "whatsapp",
        status: "proposal_sent",
      },
      {
        contactName: "Villa Corazon",
        contactEmail: "stay@villacorazon.ph",
        contactWhatsapp: "+639175550101",
        propertyType: "commercial",
        location: "El Nido",
        energyUsageKwh: "1900.00",
        monthlyBillPhp: "41000.00",
        gridState: "rationed",
        timeline: "planned",
        notes: "12-room boutique hotel, power only 6pm-6am from the co-op.",
        sourceChannel: "web_form",
        status: "audit_booked",
      },
      {
        contactName: "Barangay San Vicente Coldstore",
        contactWhatsapp: "+639063334455",
        propertyType: "maintenance",
        location: "San Vicente",
        energyUsageKwh: "1250.00",
        monthlyBillPhp: "22000.00",
        gridState: "unstable",
        timeline: "exploring",
        notes: "Existing 10kW array needs cleaning + inverter diagnostics.",
        sourceChannel: "whatsapp",
        status: "contacted",
      },
    ])
    .returning({ id: leads.id, name: leads.contactName, location: leads.location });

  const byName = (needle: string) => inserted.find((row) => row.name.includes(needle))?.id ?? null;

  if (systemCount.count === 0) {
    await db.insert(systems).values([
    {
      leadId: byName("Ruby"),
      siteName: "Island Resort Linapacan",
      location: "Linapacan",
      propertyType: "commercial",
      capacityKw: "7.30",
      batteryKwh: "20.00",
      status: "online",
      wifiConnected: true,
      uptimePct: "99.80",
      commissionedAt: daysFromNow(-420),
    },
    {
      siteName: "Puerto Princesa Logistics Hub",
      location: "Puerto Princesa",
      propertyType: "industrial_marine",
      capacityKw: "46.00",
      batteryKwh: "90.00",
      status: "warning",
      wifiConnected: true,
      uptimePct: "97.20",
      commissionedAt: daysFromNow(-180),
    },
    {
      siteName: "El Nido Beachfront Villas",
      location: "El Nido",
      propertyType: "commercial",
      capacityKw: "18.50",
      batteryKwh: "40.00",
      status: "online",
      wifiConnected: true,
      uptimePct: "99.10",
      commissionedAt: daysFromNow(-95),
    },
    {
      siteName: "Coron Dive Compressor Shed",
      location: "Coron",
      propertyType: "industrial_marine",
      capacityKw: "12.00",
      batteryKwh: "25.00",
      status: "offline",
      wifiConnected: false,
      uptimePct: "88.40",
      commissionedAt: daysFromNow(-240),
    },
    ]);
  }

  if (appointmentCount.count > 0) return;

  await db.insert(appointments).values([
    {
      leadId: byName("Villa Corazon"),
      title: "Site audit — Villa Corazon (12 rooms)",
      kind: "audit",
      scheduledFor: daysFromNow(2, 9),
      crew: "Audit Team A",
      location: "El Nido",
      status: "scheduled",
    },
    {
      leadId: byName("Seabreeze"),
      title: "Install mobilisation — Seabreeze Dive Co.",
      kind: "install",
      scheduledFor: daysFromNow(6, 7),
      crew: "Crew Bravo",
      location: "Coron",
      status: "scheduled",
      durationMinutes: 480,
    },
    {
      leadId: byName("Barangay"),
      title: "Preventive maintenance — Coldstore array",
      kind: "maintenance",
      scheduledFor: daysFromNow(11, 13),
      crew: "Service Unit 2",
      location: "San Vicente",
      status: "scheduled",
    },
  ]);
}
