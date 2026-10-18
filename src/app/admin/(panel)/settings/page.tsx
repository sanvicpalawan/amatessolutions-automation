import OpenRouterConfig from "@/components/admin/OpenRouterConfig";
import PageHeader from "@/components/admin/PageHeader";
import { describeDatabase } from "@/lib/neon";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const database = describeDatabase();

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Configuration"
        title="OpenRouter & environment"
        description="Backend-only AI configuration. Keys live in .env and never reach the browser."
      />

      <OpenRouterConfig />

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">Database</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Driver", value: database.driver },
            { label: "Host", value: database.host },
            { label: "Configured", value: database.configured ? "yes" : "no" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-slate-50 px-3.5 py-2.5">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {item.label}
              </dt>
              <dd className="mt-0.5 truncate text-xs font-bold text-navy-900">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] text-slate-500">
          Tables: <code className="rounded bg-slate-100 px-1">users</code>,{" "}
          <code className="rounded bg-slate-100 px-1">leads</code>,{" "}
          <code className="rounded bg-slate-100 px-1">proposals</code>,{" "}
          <code className="rounded bg-slate-100 px-1">appointments</code>,{" "}
          <code className="rounded bg-slate-100 px-1">systems</code>,{" "}
          <code className="rounded bg-slate-100 px-1">settings</code>. All access goes through
          Drizzle&apos;s parameterized query builder.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Integration endpoints
        </h3>
        <ul className="mt-3 space-y-2 text-xs text-slate-600">
          <li>
            <code className="rounded bg-slate-100 px-1.5 py-0.5">POST /api/quote/generate</code> —
            protected agent endpoint (session cookie or <code>x-api-key</code>).
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1.5 py-0.5">POST /api/models/refresh</code> —
            refresh the OpenRouter catalogue.
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1.5 py-0.5">GET /api/models/status</code> —
            green-light indicator state.
          </li>
          <li>
            <code className="rounded bg-slate-100 px-1.5 py-0.5">POST /api/webhook/whatsapp</code> —
            inbound WhatsApp messages → <code>leads</code>.
          </li>
        </ul>
      </div>
    </div>
  );
}
