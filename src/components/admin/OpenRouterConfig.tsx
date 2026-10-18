"use client";

import { useEffect, useState } from "react";

import ModelStatus from "@/components/admin/ModelStatus";

type Model = { id: string; name: string; free: boolean };

type Config = {
  freeModel: string;
  paidModel: string;
  preferred: "free" | "paid";
  temperature: number;
  siteTitle: string;
};

export default function OpenRouterConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [maskedKey, setMaskedKey] = useState("…");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/settings/openrouter", { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      setConfig(payload.config as Config);
      setModels((payload.models as Model[]) ?? []);
      setMaskedKey(payload.maskedKey as string);
      setKeyConfigured(Boolean(payload.keyConfigured));
    })();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!config) return;
    setSaving(true);
    setNote("");
    try {
      const response = await fetch("/api/settings/openrouter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setNote(response.ok ? "Configuration saved." : "Could not save configuration.");
    } finally {
      setSaving(false);
    }
  }

  const freeModels = models.filter((m) => m.free);
  const paidModels = models.filter((m) => !m.free);

  return (
    <div className="space-y-6">
      <ModelStatus onRefreshed={(list) => setModels(list)} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          API key (read from .env only)
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="rounded-xl bg-slate-900 px-4 py-2.5 font-mono text-xs text-solar-300">
            OPENROUTER_API_KEY = {maskedKey}
          </code>
          <span
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
              keyConfigured ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {keyConfigured ? "Key loaded" : "Key missing"}
          </span>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          The key is never written to the database and never shipped to the browser. Edit it in the
          server <code className="rounded bg-slate-100 px-1">.env</code> file
          (<code className="rounded bg-slate-100 px-1">OPENROUTER_API_KEY=sk-or-...</code>) and
          restart, then press <strong>Refresh models</strong>. Without a key the agent falls back to
          the deterministic ROI engine.
        </p>
      </div>

      {config ? (
        <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            Model selection
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
                Free model
              </label>
              <input
                list="free-models"
                value={config.freeModel}
                onChange={(e) => setConfig({ ...config, freeModel: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
              <datalist id="free-models">
                {freeModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-slate-400">
                {freeModels.length} free models cached
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
                Paid model
              </label>
              <input
                list="paid-models"
                value={config.paidModel}
                onChange={(e) => setConfig({ ...config, paidModel: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              />
              <datalist id="paid-models">
                {paidModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </datalist>
              <p className="mt-1 text-[11px] text-slate-400">
                {paidModels.length} paid models cached
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
                Active tier
              </label>
              <select
                value={config.preferred}
                onChange={(e) =>
                  setConfig({ ...config, preferred: e.target.value as "free" | "paid" })
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
              >
                <option value="free">Free tier</option>
                <option value="paid">Paid tier</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
                Temperature ({config.temperature.toFixed(2)})
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: Number(e.target.value) })}
                className="mt-3 w-full accent-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-full bg-navy-900 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save configuration"}
          </button>
          {note ? <p className="mt-3 text-xs text-emerald-700">{note}</p> : null}
        </form>
      ) : null}

      {models.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            Cached catalogue ({models.length})
          </h3>
          <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-slate-100">
                {models.slice(0, 200).map((model) => (
                  <tr key={model.id}>
                    <td className="px-3.5 py-2 font-mono text-[11px] text-navy-800">{model.id}</td>
                    <td className="px-3.5 py-2 text-right">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          model.free
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {model.free ? "free" : "paid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
