import Link from "next/link";
import { asc, desc, gte, sql } from "drizzle-orm";

import ModelStatus from "@/components/admin/ModelStatus";
import PageHeader from "@/components/admin/PageHeader";
import { db } from "@/db";
import { appointments, leads, proposals } from "@/db/schema";
import { describeDatabase } from "@/lib/neon";
import { fleetSummary, listMonitoredSystems } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

const label = (value: string) => value.replaceAll("_", " ");

export default async function AdminDashboard() {
  const [statusRows, channelRows, recentLeads, upcoming, proposalCount, fleet] = await Promise.all([
    db
      .select({ status: leads.status, count: sql<number>`cast(count(*) as int)` })
      .from(leads)
      .groupBy(leads.status),
    db
      .select({ channel: leads.sourceChannel, count: sql<number>`cast(count(*) as int)` })
      .from(leads)
      .groupBy(leads.sourceChannel),
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(6),
    db
      .select()
      .from(appointments)
      .where(gte(appointments.scheduledFor, new Date()))
      .orderBy(asc(appointments.scheduledFor))
      .limit(5),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(proposals),
    listMonitoredSystems(),
  ]);

  const totalLeads = statusRows.reduce((sum, row) => sum + row.count, 0);
  const won = statusRows.find((row) => row.status === "won")?.count ?? 0;
  const summary = fleetSummary(fleet);
  const database = describeDatabase();

  const kpis = [
    { label: "Total leads", value: totalLeads, hint: `${won} won` },
    {
      label: "WhatsApp intake",
      value: channelRows.find((row) => row.channel === "whatsapp")?.count ?? 0,
      hint: "via webhook",
    },
    { label: "AI proposals", value: proposalCount[0]?.count ?? 0, hint: "generated" },
    { label: "Fleet producing", value: `${summary.producingKw} kW`, hint: `${summary.sites} sites` },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Backoffice"
        title="Operations dashboard"
        description={`Neon Postgres · ${database.host}`}
        action={<ModelStatus compact />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {kpi.label}
            </p>
            <p className="mt-1.5 text-2xl font-extrabold text-navy-900">{kpi.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Latest leads
            </h2>
            <Link
              href="/admin/leads"
              className="text-[11px] font-bold uppercase tracking-wider text-solar-700 hover:underline"
            >
              Open CRM →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {recentLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-navy-900">{lead.contactName}</p>
                  <p className="text-[11px] text-slate-500">
                    {label(lead.propertyType)} · {lead.location} · {label(lead.sourceChannel)}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  {label(lead.status)}
                </span>
              </li>
            ))}
            {recentLeads.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-500">No leads yet.</li>
            ) : null}
          </ul>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                Next bookings
              </h2>
              <Link
                href="/admin/calendar"
                className="text-[11px] font-bold uppercase tracking-wider text-solar-700 hover:underline"
              >
                Calendar →
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {upcoming.map((appointment) => (
                <li key={appointment.id} className="rounded-xl bg-slate-50 px-3.5 py-3">
                  <p className="text-sm font-semibold text-navy-900">{appointment.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {appointment.scheduledFor.toLocaleString("en-PH")} · {appointment.crew}
                  </p>
                </li>
              ))}
              {upcoming.length === 0 ? (
                <li className="py-4 text-center text-sm text-slate-500">Nothing scheduled.</li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                Fleet health
              </h2>
              <Link
                href="/admin/monitoring"
                className="text-[11px] font-bold uppercase tracking-wider text-solar-700 hover:underline"
              >
                Monitoring →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Online", value: summary.online, color: "text-emerald-600" },
                { label: "Warning", value: summary.warning, color: "text-amber-600" },
                { label: "Offline", value: summary.offline, color: "text-red-600" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-slate-50 py-3">
                  <p className={`text-xl font-extrabold ${item.color}`}>{item.value}</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              {summary.todayKwh} kWh generated across the fleet today.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
