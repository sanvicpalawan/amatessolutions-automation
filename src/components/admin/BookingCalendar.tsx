"use client";

import { useMemo, useState } from "react";

import type { AppointmentDTO, LeadDTO } from "@/lib/types";

const KIND_STYLE: Record<string, string> = {
  audit: "bg-sky-100 text-sky-800 border-sky-200",
  install: "bg-solar-100 text-solar-700 border-solar-200",
  maintenance: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default function BookingCalendar({
  initialAppointments,
  leads,
}: {
  initialAppointments: AppointmentDTO[];
  leads: LeadDTO[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState({
    leadId: "",
    title: "",
    kind: "audit",
    scheduledFor: "",
    crew: "Audit Team A",
    location: "Puerto Princesa",
  });
  const [note, setNote] = useState("");

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: Array<{ date: Date | null; items: AppointmentDTO[] }> = [];
    for (let i = 0; i < offset; i += 1) cells.push({ date: null, items: [] });
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      const items = appointments.filter((appointment) => {
        const when = new Date(appointment.scheduledFor);
        return (
          when.getFullYear() === date.getFullYear() &&
          when.getMonth() === date.getMonth() &&
          when.getDate() === date.getDate()
        );
      });
      cells.push({ date, items });
    }
    return cells;
  }, [cursor, appointments]);

  async function reload() {
    const response = await fetch("/api/appointments", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      appointments: Array<{ appointment: Record<string, unknown>; leadName: string | null }>;
    };
    setAppointments(
      payload.appointments.map((row) => ({
        ...(row.appointment as unknown as AppointmentDTO),
        leadName: row.leadName,
      })),
    );
  }

  async function createAppointment(event: React.FormEvent) {
    event.preventDefault();
    setNote("");
    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        leadId: form.leadId ? Number(form.leadId) : null,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setNote(payload.error ?? "Could not create the booking.");
      return;
    }
    setNote("Booking created. Lead moved to “audit booked”.");
    setForm((prev) => ({ ...prev, title: "", scheduledFor: "" }));
    await reload();
  }

  async function dispatchCrew(appointment: AppointmentDTO) {
    setBusyId(appointment.id);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispatch: true }),
      });
      const payload = await response.json();
      setNote(
        payload.dispatchNotified
          ? `Crew dispatch webhook notified for “${appointment.title}”.`
          : `Marked dispatched. Set CREW_DISPATCH_WEBHOOK_URL in .env to notify the field app.`,
      );
      await reload();
    } finally {
      setBusyId(null);
    }
  }

  const upcoming = appointments
    .filter((a) => new Date(a.scheduledFor).getTime() >= Date.now() - 86400000)
    .slice(0, 8);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            {cursor.toLocaleString("en-PH", { month: "long", year: "numeric" })}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setCursor(startOfMonth(new Date()))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              →
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((cell, index) => (
            <div
              key={index}
              className={`min-h-[78px] rounded-lg border p-1.5 text-left ${
                cell.date ? "border-slate-200 bg-white" : "border-transparent bg-slate-50/40"
              }`}
            >
              {cell.date ? (
                <>
                  <span className="text-[11px] font-bold text-slate-400">
                    {cell.date.getDate()}
                  </span>
                  <div className="mt-1 space-y-1">
                    {cell.items.map((item) => (
                      <p
                        key={item.id}
                        title={item.title}
                        className={`truncate rounded border px-1.5 py-1 text-[11px] font-semibold ${
                          KIND_STYLE[item.kind] ?? "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {new Date(item.scheduledFor).toLocaleTimeString("en-PH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        {item.title}
                      </p>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <form
          onSubmit={createAppointment}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            Book an audit
          </h3>
          <div className="mt-4 grid gap-3">
            <select
              value={form.leadId}
              onChange={(e) => setForm({ ...form, leadId: e.target.value })}
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            >
              <option value="">No linked lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.contactName} — {lead.location}
                </option>
              ))}
            </select>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Site audit — client name"
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}
                className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              >
                <option value="audit">Audit</option>
                <option value="install">Install</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <input
                value={form.crew}
                onChange={(e) => setForm({ ...form, crew: e.target.value })}
                placeholder="Crew"
                className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
            </div>
            <input
              required
              type="datetime-local"
              value={form.scheduledFor}
              onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })}
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Location"
              className="rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-navy-900 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950"
            >
              Add to calendar
            </button>
            {note ? <p className="text-xs text-emerald-700">{note}</p> : null}
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            Upcoming · crew dispatch
          </h3>
          <ul className="mt-4 space-y-3">
            {upcoming.map((appointment) => (
              <li
                key={appointment.id}
                className="rounded-xl border border-slate-200 p-3.5 transition hover:border-solar-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{appointment.title}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {new Date(appointment.scheduledFor).toLocaleString("en-PH")} ·{" "}
                      {appointment.location} · {appointment.crew}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                      appointment.status === "dispatched"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {appointment.status}
                  </span>
                </div>
                {appointment.status !== "dispatched" ? (
                  <button
                    type="button"
                    disabled={busyId === appointment.id}
                    onClick={() => dispatchCrew(appointment)}
                    className="mt-3 rounded-full bg-solar-400 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-navy-950 transition hover:bg-solar-300 disabled:opacity-60"
                  >
                    {busyId === appointment.id ? "Dispatching…" : "Dispatch crew"}
                  </button>
                ) : null}
              </li>
            ))}
            {upcoming.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-500">Nothing scheduled.</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
