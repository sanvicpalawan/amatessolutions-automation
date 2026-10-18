"use client";

import { useCallback, useEffect, useState } from "react";

export type ModelStatusPayload = {
  green: boolean;
  keyConfigured: boolean;
  maskedKey: string;
  keySource: "env" | "admin" | "none";
  message: string;
  refreshedAt: string | null;
  modelCount: number;
  freeModelCount: number;
};

export default function ModelStatus({
  compact = false,
  onRefreshed,
}: {
  compact?: boolean;
  onRefreshed?: (models: { id: string; name: string; free: boolean }[]) => void;
}) {
  const [status, setStatus] = useState<ModelStatusPayload | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/models/status", { cache: "no-store" });
    if (!response.ok) return;
    setStatus((await response.json()) as ModelStatusPayload);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setBusy(true);
    try {
      const response = await fetch("/api/models/refresh", { method: "POST" });
      const payload = await response.json();
      if (onRefreshed && Array.isArray(payload.models)) onRefreshed(payload.models);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const green = status?.green ?? false;

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-3.5 py-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${green ? "bg-emerald-500 pulse-green" : "bg-red-500"}`}
        />
        <span className="text-[11px] font-bold uppercase tracking-wider text-navy-900">
          {green ? "Agent online" : "Agent offline"}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              green ? "bg-emerald-50" : "bg-red-50"
            }`}
          >
            <span
              className={`h-3 w-3 rounded-full ${green ? "bg-emerald-500 pulse-green" : "bg-red-500"}`}
            />
          </span>
          <div>
            <p className="text-sm font-bold text-navy-900">
              OpenRouter {green ? "connected" : "not connected"}
            </p>
            <p className="text-xs text-slate-500">
              {status?.message ?? "Checking connection…"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          className="rounded-full bg-navy-900 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950 disabled:opacity-60"
        >
          {busy ? "Refreshing…" : "Refresh models"}
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "API key", value: status?.maskedKey ?? "…" },
          { label: "Models", value: String(status?.modelCount ?? 0) },
          { label: "Free models", value: String(status?.freeModelCount ?? 0) },
          {
            label: "Last refresh",
            value: status?.refreshedAt
              ? new Date(status.refreshedAt).toLocaleString("en-PH")
              : "never",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 px-3.5 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {item.label}
            </dt>
            <dd className="mt-0.5 truncate text-xs font-bold text-navy-900" title={item.value}>
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-[11px] text-slate-500">
        The key comes from{" "}
        <code className="rounded bg-slate-100 px-1">
          {status?.keySource === "env" ? ".env" : status?.keySource === "admin" ? "the backoffice" : "nowhere yet"}
        </code>{" "}
        on the server only — it is never sent to the browser, only this masked preview.
      </p>
    </div>
  );
}
