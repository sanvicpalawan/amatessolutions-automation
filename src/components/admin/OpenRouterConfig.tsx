"use client";

import { useCallback, useEffect, useState } from "react";

import ModelStatus from "@/components/admin/ModelStatus";

type Model = { id: string; name: string; free: boolean };

type Config = {
  freeModel: string;
  paidModel: string;
  preferred: "free" | "paid";
  temperature: number;
  siteTitle: string;
};

type KeySource = "env" | "admin" | "none";

export default function OpenRouterConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [maskedKey, setMaskedKey] = useState("…");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [keySource, setKeySource] = useState<KeySource>("none");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  // API key entry
  const [keyInput, setKeyInput] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyNote, setKeyNote] = useState("");

  const apply = useCallback((payload: Record<string, unknown>) => {
    setConfig(payload.config as Config);
    setModels((payload.models as Model[]) ?? []);
    setMaskedKey(payload.maskedKey as string);
    setKeyConfigured(Boolean(payload.keyConfigured));
    setKeySource((payload.keySource as KeySource) ?? "none");
  }, []);

  /** Called from event handlers after saving a key — never from the effect. */
  const load = useCallback(async () => {
    const response = await fetch("/api/settings/openrouter", { cache: "no-store" });
    if (!response.ok) return;
    apply((await response.json()) as Record<string, unknown>);
  }, [apply]);

  useEffect(() => {
    // Inlined on purpose: state is only set after the await, which keeps
    // react-hooks/set-state-in-effect happy (see the rule's guidance).
    void (async () => {
      const response = await fetch("/api/settings/openrouter", { cache: "no-store" });
      if (!response.ok) return;
      apply((await response.json()) as Record<string, unknown>);
    })();
  }, [apply]);

  async function putKey(apiKey: string) {
    setKeyBusy(true);
    setKeyNote("");
    try {
      const response = await fetch("/api/settings/openrouter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const payload = await response.json();
      setKeyNote(
        response.ok
          ? ((payload.keyMessage as string) ?? "Saved.")
          : ((payload.error as string) ?? "Could not save the key."),
      );
      if (response.ok) {
        setKeyInput("");
        await load();
      }
    } finally {
      setKeyBusy(false);
    }
  }

  async function saveKey(event: React.FormEvent) {
    event.preventDefault();
    await putKey(keyInput);
  }

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

  const sourceLabel =
    keySource === "env" ? "From environment" : keySource === "admin" ? "Stored in admin" : "Key missing";

  return (
    <div className="space-y-6">
      <ModelStatus onRefreshed={(list) => setModels(list)} />

      <form onSubmit={saveKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          OpenRouter API key
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="rounded-xl bg-slate-900 px-4 py-2.5 font-mono text-xs text-solar-300">
            openrouter_api_key = {maskedKey}
          </code>
          <span
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
              keyConfigured
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {sourceLabel}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
              Paste a key (starts with sk-or-)
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-or-v1-…"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={keyBusy || keyInput.trim() === ""}
            className="rounded-full bg-navy-900 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950 disabled:opacity-50"
          >
            {keyBusy ? "Saving…" : "Save key"}
          </button>

          <button
            type="button"
            disabled={keyBusy || keySource !== "admin"}
            onClick={() => void putKey("")}
            className="rounded-full border border-slate-300 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:border-red-300 hover:text-red-700 disabled:opacity-40"
          >
            Clear stored key
          </button>
        </div>

        {keyNote ? <p className="mt-3 text-xs font-semibold text-navy-800">{keyNote}</p> : null}

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          A key saved here is written to Postgres <strong>encrypted</strong> (AES-256-GCM) and is
          never sent to the browser — you only ever see the masked preview above. Handy while
          building: no redeploy needed.
          {keySource === "env"
            ? " OPENROUTER_API_KEY is currently set in the environment, and it takes precedence over anything saved here."
            : " If OPENROUTER_API_KEY is ever set in the environment, that value wins over this one."}{" "}
          Without a key, the agent falls back to the deterministic ROI engine.
        </p>
      </form>

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
