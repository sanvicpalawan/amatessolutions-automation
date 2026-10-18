"use client";

import { useCallback, useEffect, useState } from "react";

type Status = {
  configured: boolean;
  tokenSource: "env" | "admin" | "none";
  maskedToken: string;
  phoneNumberId: string;
  apiVersion: string;
  verifyToken: string;
  tokenFromEnv: boolean;
  phoneFromEnv: boolean;
  missing: string[];
  webhookUrl: string;
};

type Config = { phoneNumberId: string; verifyToken: string; apiVersion: string };

type CheckResult = { ok: boolean; detail?: string; verifiedName?: string; displayPhoneNumber?: string; qualityRating?: string };

export default function WhatsappConfig() {
  const [status, setStatus] = useState<Status | null>(null);
  const [config, setConfig] = useState<Config | null>(null);

  const [tokenInput, setTokenInput] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenNote, setTokenNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<CheckResult | null>(null);

  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testNote, setTestNote] = useState("");

  const apply = useCallback((payload: Record<string, unknown>) => {
    setStatus(payload.status as Status);
    setConfig(payload.config as Config);
  }, []);

  /** Called from event handlers after saving — never synchronously from the effect. */
  const load = useCallback(async () => {
    const response = await fetch("/api/settings/whatsapp", { cache: "no-store" });
    if (!response.ok) return;
    apply((await response.json()) as Record<string, unknown>);
  }, [apply]);

  useEffect(() => {
    // Inlined on purpose: state is only set after the await, which keeps
    // react-hooks/set-state-in-effect happy (see the rule's guidance).
    void (async () => {
      const response = await fetch("/api/settings/whatsapp", { cache: "no-store" });
      if (!response.ok) return;
      apply((await response.json()) as Record<string, unknown>);
    })();
  }, [apply]);

  async function send(body: Record<string, unknown>, method: "PUT" | "POST") {
    const response = await fetch("/api/settings/whatsapp", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { response, payload: (await response.json().catch(() => ({}))) as Record<string, unknown> };
  }

  async function saveToken(value: string) {
    setTokenBusy(true);
    setTokenNote("");
    try {
      const { response, payload } = await send({ accessToken: value }, "PUT");
      setTokenNote(
        response.ok
          ? ((payload.tokenMessage as string) ?? "Saved.")
          : ((payload.error as string) ?? "Could not save the token."),
      );
      if (response.ok) {
        setTokenInput("");
        await load();
      }
    } finally {
      setTokenBusy(false);
    }
  }

  async function saveConfig(event: React.FormEvent) {
    event.preventDefault();
    if (!config) return;
    setSaving(true);
    setNote("");
    try {
      const { response, payload } = await send(config, "PUT");
      if (response.ok) {
        setNote("Saved.");
        await load();
      } else {
        setNote((payload.error as string) ?? "Could not save.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function verify() {
    setChecking(true);
    setCheck(null);
    try {
      const { response, payload } = await send({ action: "verify" }, "POST");
      setCheck(
        response.ok
          ? { ok: true, verifiedName: payload.verifiedName as string, displayPhoneNumber: payload.displayPhoneNumber as string, qualityRating: payload.qualityRating as string | undefined }
          : { ok: false, detail: (payload.detail as string) ?? "Could not verify." },
      );
    } finally {
      setChecking(false);
    }
  }

  async function testSend(event: React.FormEvent) {
    event.preventDefault();
    setTesting(true);
    setTestNote("");
    try {
      const { response, payload } = await send({ action: "test", to: testTo }, "POST");
      if (response.ok && payload.sent) {
        setTestNote(`Sent. Meta message id ${String(payload.messageId).slice(0, 28)}…`);
      } else {
        setTestNote((payload.detail as string) ?? (payload.error as string) ?? "Could not send.");
      }
    } finally {
      setTesting(false);
    }
  }

  if (!status || !config) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-500">Loading WhatsApp settings…</p>
      </div>
    );
  }

  const sourceLabel =
    status.tokenSource === "env"
      ? "From environment"
      : status.tokenSource === "admin"
        ? "Stored in admin"
        : "Token missing";

  return (
    <div className="space-y-6">
      {/* ---- Status ------------------------------------------------ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            WhatsApp sending
          </h3>
          <span
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
              status.configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"
            }`}
          >
            {status.configured ? "Ready to send" : "Off"}
          </span>
        </div>

        {status.configured ? (
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            The agent will deliver its replies on WhatsApp. It answers a message that arrives on
            WhatsApp; it cannot message a website-form lead first, because Meta only allows
            free-form text within 24 hours of the customer&apos;s last message.
          </p>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            Still needed: <strong>{status.missing.join(" and ")}</strong>. Until then the agent
            writes its replies into the audit log and marks them{" "}
            <em>not delivered</em> — it never pretends a message was sent.
          </p>
        )}

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Access token", value: status.maskedToken },
            { label: "Phone number ID", value: status.phoneNumberId || "not set" },
            { label: "Graph API", value: status.apiVersion },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {item.label}
              </dt>
              <dd className="mt-0.5 truncate font-mono text-xs font-bold text-navy-900">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ---- Access token ------------------------------------------ */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void saveToken(tokenInput);
        }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Access token
        </h3>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <code className="rounded-xl bg-slate-900 px-4 py-2.5 font-mono text-xs text-solar-300">
            whatsapp_access_token = {status.maskedToken}
          </code>
          <span
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
              status.tokenSource === "none"
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {sourceLabel}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
              Paste the token from Meta → WhatsApp → API Setup
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="EAA…"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={tokenBusy || tokenInput.trim() === ""}
            className="rounded-full bg-navy-900 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950 disabled:opacity-50"
          >
            {tokenBusy ? "Saving…" : "Save token"}
          </button>

          <button
            type="button"
            disabled={tokenBusy || status.tokenSource !== "admin"}
            onClick={() => void saveToken("")}
            className="rounded-full border border-slate-300 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:border-red-300 hover:text-red-700 disabled:opacity-40"
          >
            Clear stored token
          </button>
        </div>

        {tokenNote ? <p className="mt-3 text-xs font-semibold text-navy-800">{tokenNote}</p> : null}

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Stored <strong>encrypted</strong> (AES-256-GCM) in Postgres and never sent to the browser.
          Use a <strong>System User</strong> token with{" "}
          <code className="rounded bg-slate-100 px-1">whatsapp_business_messaging</code> — the
          temporary token Meta shows on the API Setup page expires in 24 hours.
          {status.tokenFromEnv
            ? " WHATSAPP_ACCESS_TOKEN is currently set in the environment and takes precedence over anything saved here."
            : " If WHATSAPP_ACCESS_TOKEN is ever set in the environment, it wins over this one."}
        </p>
      </form>

      {/* ---- Number + webhook -------------------------------------- */}
      <form onSubmit={saveConfig} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Sender number &amp; webhook
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
              Phone number ID
            </label>
            <input
              value={config.phoneNumberId}
              onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
              disabled={status.phoneFromEnv}
              placeholder="123456789012345"
              inputMode="numeric"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm disabled:bg-slate-100"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {status.phoneFromEnv
                ? "Set in the environment, so this field is ignored."
                : "Digits only. This is the ID, not the phone number itself."}
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
              Verify token
            </label>
            <input
              value={config.verifyToken}
              onChange={(e) => setConfig({ ...config, verifyToken: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Paste this same value into Meta&apos;s webhook setup when it asks.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
              Graph API version
            </label>
            <input
              value={config.apiVersion}
              onChange={(e) => setConfig({ ...config, apiVersion: e.target.value })}
              placeholder="v26.0"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
              Webhook URL (put this in Meta)
            </label>
            <input
              readOnly
              value={status.webhookUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-navy-800"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-navy-900 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>

          <button
            type="button"
            onClick={() => void verify()}
            disabled={checking || !status.configured}
            className="rounded-full border border-slate-300 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40"
          >
            {checking ? "Checking…" : "Check connection with Meta"}
          </button>
        </div>

        {note ? <p className="mt-3 text-xs font-semibold text-emerald-700">{note}</p> : null}

        {check ? (
          <div
            className={`mt-3 rounded-xl px-3.5 py-3 text-xs font-semibold ${
              check.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
            }`}
          >
            {check.ok ? (
              <>
                Connected to <strong>{check.verifiedName}</strong> ({check.displayPhoneNumber})
                {check.qualityRating ? ` — quality ${check.qualityRating}` : ""}. The token and
                phone number ID are a working pair.
              </>
            ) : (
              check.detail
            )}
          </div>
        ) : null}
      </form>

      {/* ---- Test send --------------------------------------------- */}
      <form onSubmit={testSend} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">Send a test message</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          This sends a real WhatsApp message. Meta only allows free-form text within 24 hours of
          that person&apos;s last message to you, so <strong>message the business number from this
          phone first</strong>, then test — otherwise Meta refuses with error 131047 and the refusal
          is shown here rather than hidden.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800">
              Send to
            </label>
            <input
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="+63917 000 0000"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={testing || testTo.trim() === ""}
            className="rounded-full border border-slate-300 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:border-solar-400 disabled:opacity-40"
          >
            {testing ? "Sending…" : "Send test"}
          </button>
        </div>

        {testNote ? <p className="mt-3 text-xs font-semibold text-navy-800">{testNote}</p> : null}
      </form>
    </div>
  );
}
