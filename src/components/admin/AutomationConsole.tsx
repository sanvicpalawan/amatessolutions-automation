"use client";

import { useCallback, useEffect, useState } from "react";

type Rule = {
  key: string;
  label: string;
  description: string;
  trigger: "intake" | "schedule";
  enabled: boolean;
  runCount: number;
  lastRunAt: string | null;
};

type LogEntry = {
  id: number;
  rule: string;
  action: string;
  status: string;
  message: string;
  targetType: string;
  targetId: number | null;
  createdAt: string;
};

const TRIGGER_LABEL: Record<string, string> = {
  intake: "On every lead",
  schedule: "Daily cron",
};

const STATUS_STYLE: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  skipped: "bg-slate-100 text-slate-500",
};

export default function AutomationConsole({
  initialRules,
  initialLog,
}: {
  initialRules: Rule[];
  initialLog: LogEntry[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [log, setLog] = useState(initialLog);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const reload = useCallback(async () => {
    const response = await fetch("/api/automations", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { rules: Rule[]; log: LogEntry[] };
    setRules(payload.rules);
    setLog(payload.log);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function toggle(rule: Rule) {
    setRules((prev) =>
      prev.map((item) => (item.key === rule.key ? { ...item, enabled: !item.enabled } : item)),
    );
    await fetch("/api/automations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: rule.key, enabled: !rule.enabled }),
    });
    setNote(`${rule.label} ${rule.enabled ? "disabled" : "enabled"}.`);
  }

  async function runSweep() {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch("/api/automations", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setNote(payload.error ?? "Sweep failed.");
        return;
      }
      setNote(
        `Sweep finished — ${payload.createdAppointments ?? 0} jobs raised, ${payload.flaggedLeads ?? 0} leads followed up.`,
      );
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const active = rules.filter((rule) => rule.enabled).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Automations", value: `${active}/${rules.length}`, hint: "currently active" },
          {
            label: "Actions taken",
            value: rules.reduce((sum, rule) => sum + rule.runCount, 0),
            hint: "all time",
          },
          { label: "Recent activity", value: log.length, hint: "last 30 events" },
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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Automation rules
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Toggle what the system does for you. Intake rules fire on every new enquiry; the sweep
              runs once a day, 06:00 Asia/Manila, via <code>/api/cron/sweep</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={runSweep}
            disabled={busy}
            className="rounded-full bg-navy-900 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950 disabled:opacity-60"
          >
            {busy ? "Running…" : "Run sweep now"}
          </button>
        </div>

        <ul className="divide-y divide-slate-100">
          {rules.map((rule) => (
            <li key={rule.key} className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-navy-900">{rule.label}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {TRIGGER_LABEL[rule.trigger]}
                  </span>
                  {rule.runCount > 0 ? (
                    <span className="rounded-full bg-solar-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-solar-700">
                      {rule.runCount} runs
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-600">
                  {rule.description}
                </p>
                {rule.lastRunAt ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Last run {new Date(rule.lastRunAt).toLocaleString("en-PH")}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => toggle(rule)}
                role="switch"
                aria-checked={rule.enabled}
                aria-label={`Toggle ${rule.label}`}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  rule.enabled ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    rule.enabled ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {note ? (
        <p className="rounded-xl bg-solar-50 px-4 py-3 text-xs font-medium text-navy-800">{note}</p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-200 p-5 text-sm font-bold uppercase tracking-wider text-navy-900">
          Activity log
        </h2>
        <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
          {log.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
              <span
                className={`mt-1 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  STATUS_STYLE[entry.status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {entry.status}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-navy-900">
                  {entry.rule.replaceAll("_", " ")} · {entry.action.replaceAll("_", " ")}
                </p>
                <p className="mt-0.5 text-xs text-slate-600">{entry.message}</p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">
                {new Date(entry.createdAt).toLocaleString("en-PH")}
              </span>
            </li>
          ))}
          {log.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-slate-500">
              No automated actions yet — submit the quote form to see the pipeline run.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
