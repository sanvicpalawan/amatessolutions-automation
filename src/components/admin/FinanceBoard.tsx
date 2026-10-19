"use client";

import { useMemo, useState } from "react";

import RowField from "@/components/admin/RowField";
import { Icon } from "@/lib/icons";
import {
  EXPENSE_CATEGORIES,
  JOB_STATUSES,
  RECURRING_CATEGORIES,
  RECURRING_CYCLES,
  RECURRING_PLANS,
  isValidPeriod,
  jobTotalCostMinor,
  monthSummary,
  monthlyEquivalentMinor,
  periodLabel,
  periodsWithData,
  trailingPeriods,
  type ExpenseItem,
  type FinanceData,
  type JobItem,
  type MarketingItem,
  type RecurringItem,
} from "@/lib/finance-model";
import { money, percent, toMinor } from "@/lib/money";

type Tab = "overview" | "subscriptions" | "jobs" | "marketing";

/**
 * Every tab below sits in a `@container`, so the responsive variants here are
 * `@sm:`/`@3xl:`/`@4xl:` (container width), not `sm:`/`md:`/`lg:` (viewport
 * width). The admin column is much narrower than the window once the sidebar
 * and page padding are taken out, and on a phone the two are simply not the
 * same number. Collections render as a real table once there is room for one,
 * and as a stack of labelled cards when there is not.
 */

const TABS: { value: Tab; label: string; icon: string }[] = [
  { value: "overview", label: "Overview", icon: "ChartLine" },
  { value: "subscriptions", label: "Subscriptions", icon: "Layers" },
  { value: "jobs", label: "Solar jobs", icon: "Sun" },
  { value: "marketing", label: "Marketing", icon: "TrendingUp" },
];

type RecurringDraft = {
  id: number | null;
  name: string;
  vendor: string;
  amount: string;
  currency: string;
  cycle: string;
  plan: string;
  category: string;
  nextRenewal: string;
  active: boolean;
  notes: string;
};

type JobDraft = {
  id: number | null;
  customer: string;
  location: string;
  sizeKwp: string;
  status: string;
  sellPrice: string;
  closedOn: string;
  notes: string;
  costLines: { label: string; amount: string }[];
};

type MarketingDraft = {
  id: number | null;
  period: string;
  campaign: string;
  planned: string;
  actual: string;
  notes: string;
};

type ExpenseDraft = {
  id: number | null;
  label: string;
  amount: string;
  category: string;
  spentOn: string;
  jobId: string;
  notes: string;
};

const EMPTY_RECURRING: RecurringDraft = {
  id: null,
  name: "",
  vendor: "",
  amount: "",
  currency: "PHP",
  cycle: "monthly",
  plan: "paid",
  category: "hosting",
  nextRenewal: "",
  active: true,
  notes: "",
};

const EMPTY_JOB: JobDraft = {
  id: null,
  customer: "",
  location: "Palawan",
  sizeKwp: "",
  status: "quoted",
  sellPrice: "",
  closedOn: "",
  notes: "",
  costLines: [{ label: "", amount: "" }],
};

const EMPTY_EXPENSE: ExpenseDraft = {
  id: null,
  label: "",
  amount: "",
  category: "other",
  spentOn: "",
  jobId: "",
  notes: "",
};

function emptyMarketing(period: string): MarketingDraft {
  return { id: null, period, campaign: "", planned: "", actual: "", notes: "" };
}

/** 150050 becomes "1500.50", for a number input. */
const majorInput = (minor: number) => (minor / 100).toFixed(2);

const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-slate-500";
const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30";
/** Free text is often a paragraph pasted from a supplier page — give it a real box. */
const textAreaClass = `${fieldClass} resize-y leading-relaxed`;
const smallFieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30";
const primaryButtonClass =
  "rounded-full bg-solar-400 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-navy-950 transition hover:bg-solar-300 disabled:opacity-60";
const ghostButtonClass =
  "rounded-full border border-slate-300 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-slate-400";
const iconButtonClass =
  "rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-slate-400 hover:text-navy-900";

const STATUS_TONES: Record<string, string> = {
  quoted: "bg-sky-100 text-sky-800",
  won: "bg-emerald-100 text-emerald-800",
  installing: "bg-violet-100 text-violet-800",
  completed: "bg-navy-900 text-white",
  lost: "bg-slate-200 text-slate-600",
};

export default function FinanceBoard({
  initialData,
  initialPeriod,
}: {
  initialData: FinanceData;
  initialPeriod: string;
}) {
  const [data, setData] = useState<FinanceData>(initialData);
  const [period, setPeriod] = useState(initialPeriod);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [rateDraft, setRateDraft] = useState(
    initialData.usdToPhp ? String(initialData.usdToPhp) : "",
  );

  const [recurringDraft, setRecurringDraft] = useState<RecurringDraft | null>(null);
  const [jobDraft, setJobDraft] = useState<JobDraft | null>(null);
  const [marketingDraft, setMarketingDraft] = useState<MarketingDraft | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);

  async function refresh() {
    const response = await fetch("/api/admin/finance", { cache: "no-store" });
    if (!response.ok) return;
    setData((await response.json()) as FinanceData);
  }

  async function send(
    method: "POST" | "PATCH" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<boolean> {
    if (busy) return false;
    setError("");
    setBusy(true);
    try {
      const response = await fetch(path, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const problem = (await response.json().catch(() => ({}))) as { error?: string };
        setError(problem.error ?? "Could not save that.");
        return false;
      }
      await refresh();
      return true;
    } catch {
      setError("Could not reach the server.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const rate = data.usdToPhp;
  const summary = useMemo(() => monthSummary(data, period), [data, period]);
  const history = useMemo(
    () => trailingPeriods(period, 6).map((item) => monthSummary(data, item)),
    [data, period],
  );
  const knownPeriods = useMemo(() => periodsWithData(data, initialPeriod), [data, initialPeriod]);

  const activeRecurring = data.recurring.filter((item) => item.active);
  const monthlyOverhead = activeRecurring.reduce(
    (sum, item) => sum + monthlyEquivalentMinor(item, rate),
    0,
  );
  const monthMarketing = data.marketing.filter((row) => row.period === period);
  const jobById = new Map(data.jobs.map((job) => [job.id, job]));

  async function saveRate() {
    const parsed = Number(rateDraft);
    const ok = await send("PATCH", "/api/admin/finance", {
      usdToPhp: Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
    });
    if (ok) await refresh();
  }

  /* ---------------- Submissions ---------------- */

  async function saveRecurring() {
    if (!recurringDraft) return;
    const payload = {
      name: recurringDraft.name,
      vendor: recurringDraft.vendor,
      amountMinor: toMinor(recurringDraft.amount),
      currency: recurringDraft.currency,
      cycle: recurringDraft.cycle,
      plan: recurringDraft.plan,
      category: recurringDraft.category,
      nextRenewal: recurringDraft.nextRenewal || null,
      active: recurringDraft.active,
      notes: recurringDraft.notes,
    };
    const ok = recurringDraft.id
      ? await send("PATCH", `/api/admin/finance/recurring/${recurringDraft.id}`, payload)
      : await send("POST", "/api/admin/finance/recurring", payload);
    if (ok) setRecurringDraft(null);
  }

  async function saveJob() {
    if (!jobDraft) return;
    const payload = {
      customer: jobDraft.customer,
      location: jobDraft.location,
      sizeKwp: jobDraft.sizeKwp || null,
      status: jobDraft.status,
      sellPriceMinor: toMinor(jobDraft.sellPrice),
      closedOn: jobDraft.closedOn || null,
      notes: jobDraft.notes,
      costLines: jobDraft.costLines.map((line) => ({
        label: line.label,
        amountMinor: toMinor(line.amount),
      })),
    };
    const ok = jobDraft.id
      ? await send("PATCH", `/api/admin/finance/jobs/${jobDraft.id}`, payload)
      : await send("POST", "/api/admin/finance/jobs", payload);
    if (ok) setJobDraft(null);
  }

  async function saveMarketing() {
    if (!marketingDraft) return;
    const payload = {
      period: marketingDraft.period,
      campaign: marketingDraft.campaign,
      plannedMinor: toMinor(marketingDraft.planned),
      actualMinor: toMinor(marketingDraft.actual),
      notes: marketingDraft.notes,
    };
    const ok = marketingDraft.id
      ? await send("PATCH", `/api/admin/finance/marketing/${marketingDraft.id}`, payload)
      : await send("POST", "/api/admin/finance/marketing", payload);
    if (ok) setMarketingDraft(null);
  }

  async function saveExpense() {
    if (!expenseDraft) return;
    const payload = {
      label: expenseDraft.label,
      amountMinor: toMinor(expenseDraft.amount),
      category: expenseDraft.category,
      spentOn: expenseDraft.spentOn || null,
      jobId: expenseDraft.jobId ? Number(expenseDraft.jobId) : null,
      notes: expenseDraft.notes,
    };
    const ok = expenseDraft.id
      ? await send("PATCH", `/api/admin/finance/expenses/${expenseDraft.id}`, payload)
      : await send("POST", "/api/admin/finance/expenses", payload);
    if (ok) setExpenseDraft(null);
  }

  async function toggleRecurring(item: RecurringItem) {
    await send("PATCH", `/api/admin/finance/recurring/${item.id}`, { active: !item.active });
  }

  async function removeRow(kind: string, id: number, what: string) {
    if (!confirm(`Delete this ${what}?`)) return;
    await send("DELETE", `/api/admin/finance/${kind}/${id}`);
  }

  function editRecurring(item: RecurringItem) {
    setError("");
    setRecurringDraft({
      id: item.id,
      name: item.name,
      vendor: item.vendor,
      amount: majorInput(item.amountMinor),
      currency: item.currency,
      cycle: item.cycle,
      plan: item.plan,
      category: item.category,
      nextRenewal: item.nextRenewal ?? "",
      active: item.active,
      notes: item.notes,
    });
  }

  function editJob(job: JobItem) {
    setError("");
    setJobDraft({
      id: job.id,
      customer: job.customer,
      location: job.location,
      sizeKwp: job.sizeKwp ?? "",
      status: job.status,
      sellPrice: majorInput(job.sellPriceMinor),
      closedOn: job.closedOn ?? "",
      notes: job.notes,
      costLines:
        job.costLines.length > 0
          ? job.costLines.map((line) => ({ label: line.label, amount: majorInput(line.amountMinor) }))
          : [{ label: "", amount: "" }],
    });
  }

  function editMarketing(item: MarketingItem) {
    setError("");
    setMarketingDraft({
      id: item.id,
      period: item.period,
      campaign: item.campaign,
      planned: majorInput(item.plannedMinor),
      actual: majorInput(item.actualMinor),
      notes: item.notes,
    });
  }

  function editExpense(item: ExpenseItem) {
    setError("");
    setExpenseDraft({
      id: item.id,
      label: item.label,
      amount: majorInput(item.amountMinor),
      category: item.category,
      spentOn: item.spentOn ?? "",
      jobId: item.jobId ? String(item.jobId) : "",
      notes: item.notes,
    });
  }

  /* ---------------- Render helpers ---------------- */

  const statCard = (
    label: string,
    value: string,
    hint: string,
    tone: "plain" | "good" | "bad" = "plain",
  ) => (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-1.5 text-base font-extrabold tracking-tight break-words @xl:text-xl ${
          tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-navy-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{hint}</p>
    </div>
  );

  const plRow = (label: string, value: string, options?: { bold?: boolean; muted?: boolean; note?: string }) => (
    <div
      className={`flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0 ${
        options?.bold ? "font-extrabold text-navy-900" : "text-slate-700"
      }`}
    >
      <span className="text-sm">
        {label}
        {options?.note ? (
          <span className="ml-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {options.note}
          </span>
        ) : null}
      </span>
      <span className={`text-sm tabular-nums ${options?.muted ? "text-slate-400" : ""}`}>{value}</span>
    </div>
  );

  /** "Free plan" is a badge, not a cycle, so it is shared by both layouts. */
  const planBadge = (item: RecurringItem) =>
    item.plan === "free" ? (
      <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
        Free plan
      </span>
    ) : null;

  /** Shared by the wide subscription table and the narrow subscription card. */
  const recurringActions = (item: RecurringItem) => (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void toggleRecurring(item)}
        className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:border-solar-400 hover:text-solar-600"
      >
        {item.active ? "Pause" : "Resume"}
      </button>
      <button
        type="button"
        aria-label="Edit subscription"
        onClick={() => editRecurring(item)}
        className={iconButtonClass}
      >
        <Icon name="Pencil" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Delete subscription"
        onClick={() => void removeRow("recurring", item.id, "subscription")}
        className={`${iconButtonClass} hover:border-red-300 hover:text-red-500`}
      >
        <Icon name="Trash2" className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const statusBadge = (job: JobItem) => (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        STATUS_TONES[job.status] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {job.status}
    </span>
  );

  /** Shared by the wide job table and the narrow job card. */
  const jobActions = (job: JobItem) => (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Edit job"
        onClick={() => editJob(job)}
        className={iconButtonClass}
      >
        <Icon name="Pencil" className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Delete job"
        onClick={() => void removeRow("jobs", job.id, "job")}
        className={`${iconButtonClass} hover:border-red-300 hover:text-red-500`}
      >
        <Icon name="Trash2" className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  /* ---------------- Tabs ---------------- */

  const overview = (
    <div className="@container space-y-5">
      {summary.needsRate ? (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Icon name="TriangleAlert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Some rows are priced in US dollars but no exchange rate is set, so they are counted as
            zero. Set the USD to PHP rate in the toolbar above to make these figures real.
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        {statCard("Revenue", money(summary.revenueMinor), `${summary.jobs.length} job(s) closed`)}
        {statCard(
          "Gross profit",
          money(summary.grossMinor),
          summary.revenueMinor > 0 ? `${percent(summary.grossMarginPct)} margin` : "no revenue yet",
          summary.grossMinor >= 0 ? "good" : "bad",
        )}
        {statCard("Monthly overhead", money(summary.overheadMinor), `${activeRecurring.length} active subscriptions`)}
        {statCard(
          "Net profit",
          money(summary.netMinor),
          summary.netMinor >= 0 ? "in the black" : "in the red",
          summary.netMinor >= 0 ? "good" : "bad",
        )}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
          Profit and loss — {periodLabel(period)}
        </h3>
        <div className="mt-3">
          {plRow("Revenue", money(summary.revenueMinor))}
          {plRow("Job costs", `-${money(summary.jobCostMinor)}`)}
          {plRow("Gross profit", money(summary.grossMinor), {
            bold: true,
            note: summary.revenueMinor > 0 ? `${percent(summary.grossMarginPct)} margin` : undefined,
          })}
          {plRow("Subscriptions", `-${money(summary.recurringMinor)}`)}
          {plRow("Marketing", `-${money(summary.marketingActualMinor)}`, {
            note:
              summary.marketingPlannedMinor > 0
                ? `planned ${money(summary.marketingPlannedMinor)}`
                : "nothing planned",
          })}
          {plRow("Other costs", `-${money(summary.otherCostMinor)}`)}
          {plRow("Net profit", money(summary.netMinor), { bold: true })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          No office and no payroll, so subscriptions plus marketing are the whole overhead. Materials
          are costed per job, at the price your suppliers actually quote.
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="px-5 pt-5 text-sm font-bold uppercase tracking-wider text-navy-900">
          Last 6 months
        </h3>
        {/* Five numeric columns need room; below that each month is a card. */}
        <div className="mt-3 hidden overflow-x-auto @3xl:block">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 whitespace-nowrap">Month</th>
                <th className="px-5 py-3 whitespace-nowrap text-right">Revenue</th>
                <th className="px-5 py-3 whitespace-nowrap text-right">Job costs</th>
                <th className="px-5 py-3 whitespace-nowrap text-right">Overhead</th>
                <th className="px-5 py-3 whitespace-nowrap text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((row) => (
                <tr
                  key={row.period}
                  className={row.period === period ? "bg-solar-50/60" : undefined}
                >
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setPeriod(row.period)}
                      className="font-semibold text-navy-900 underline decoration-slate-300 underline-offset-2 hover:decoration-solar-400"
                    >
                      {periodLabel(row.period)}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{money(row.revenueMinor)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                    {money(row.jobCostMinor)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                    {money(row.overheadMinor)}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-bold tabular-nums ${
                      row.netMinor >= 0 ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {money(row.netMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-2 divide-y divide-slate-100 @3xl:hidden">
          {history.map((row) => (
            <li
              key={row.period}
              className={`py-3.5 first:pt-1 ${row.period === period ? "bg-solar-50/60" : ""}`}
            >
              <button
                type="button"
                onClick={() => setPeriod(row.period)}
                className="font-semibold text-navy-900 underline decoration-slate-300 underline-offset-2 hover:decoration-solar-400"
              >
                {periodLabel(row.period)}
              </button>
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
                <RowField label="Revenue" value={money(row.revenueMinor)} />
                <RowField label="Job costs" value={money(row.jobCostMinor)} tone="muted" />
                <RowField label="Overhead" value={money(row.overheadMinor)} tone="muted" />
                <RowField
                  label="Net"
                  value={money(row.netMinor)}
                  tone={row.netMinor >= 0 ? "good" : "bad"}
                />
              </dl>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

  const subscriptions = (
    <div className="@container space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">Subscriptions</h3>
            <p className="mt-1 text-xs text-slate-500">
              {money(monthlyOverhead)} a month across {activeRecurring.length} active item(s). Yearly
              and quarterly bills are divided down so a month is a month.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRecurringDraft(recurringDraft ? null : { ...EMPTY_RECURRING })}
            className={primaryButtonClass}
          >
            {recurringDraft ? "Close" : "+ Add subscription"}
          </button>
        </div>

        {recurringDraft ? (
          <div className="mt-4 rounded-2xl border border-solar-300 bg-solar-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className={labelClass} htmlFor="rec-name">
                  What is it
                </label>
                <input
                  id="rec-name"
                  className={fieldClass}
                  value={recurringDraft.name}
                  placeholder="UpCloud VPS"
                  onChange={(event) => setRecurringDraft({ ...recurringDraft, name: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="rec-vendor">
                  Vendor
                </label>
                <input
                  id="rec-vendor"
                  className={fieldClass}
                  value={recurringDraft.vendor}
                  placeholder="UpCloud"
                  onChange={(event) => setRecurringDraft({ ...recurringDraft, vendor: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="rec-plan">
                  Plan
                </label>
                <select
                  id="rec-plan"
                  className={fieldClass}
                  value={recurringDraft.plan}
                  onChange={(event) => setRecurringDraft({ ...recurringDraft, plan: event.target.value })}
                >
                  {RECURRING_PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan === "free" ? "Free plan" : "Paid"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="rec-amount">
                  Amount
                </label>
                <input
                  id="rec-amount"
                  className={`${fieldClass} disabled:bg-slate-100`}
                  value={recurringDraft.plan === "free" ? "0" : recurringDraft.amount}
                  disabled={recurringDraft.plan === "free"}
                  inputMode="decimal"
                  placeholder="1500.00"
                  onChange={(event) => setRecurringDraft({ ...recurringDraft, amount: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="rec-currency">
                  Currency
                </label>
                <select
                  id="rec-currency"
                  className={fieldClass}
                  value={recurringDraft.currency}
                  onChange={(event) => setRecurringDraft({ ...recurringDraft, currency: event.target.value })}
                >
                  <option value="PHP">PHP</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="rec-cycle">
                  Billed
                </label>
                <select
                  id="rec-cycle"
                  className={fieldClass}
                  value={recurringDraft.cycle}
                  onChange={(event) => setRecurringDraft({ ...recurringDraft, cycle: event.target.value })}
                >
                  {RECURRING_CYCLES.map((cycle) => (
                    <option key={cycle} value={cycle}>
                      {cycle}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="rec-category">
                  Category
                </label>
                <select
                  id="rec-category"
                  className={fieldClass}
                  value={recurringDraft.category}
                  onChange={(event) => setRecurringDraft({ ...recurringDraft, category: event.target.value })}
                >
                  {RECURRING_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="rec-renewal">
                  Next renewal
                </label>
                <input
                  id="rec-renewal"
                  type="date"
                  className={fieldClass}
                  value={recurringDraft.nextRenewal}
                  onChange={(event) =>
                    setRecurringDraft({ ...recurringDraft, nextRenewal: event.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelClass} htmlFor="rec-notes">
                  Notes
                </label>
                <textarea
                  id="rec-notes"
                  rows={3}
                  className={textAreaClass}
                  value={recurringDraft.notes}
                  placeholder="What it is for, when to review it… Paste a supplier's plan list here if you like."
                  onChange={(event) => setRecurringDraft({ ...recurringDraft, notes: event.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void saveRecurring()} disabled={busy} className={primaryButtonClass}>
                {busy ? "Saving…" : recurringDraft.id ? "Save changes" : "Add subscription"}
              </button>
              <button type="button" onClick={() => setRecurringDraft(null)} className={ghostButtonClass}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {/* A real table once seven columns fit, cards below that. */}
        <div className="mt-4 hidden overflow-x-auto @4xl:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Item</th>
                <th className="px-4 py-3 whitespace-nowrap">Billed</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Amount</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Per month</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Renews</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recurring.map((item) => (
                <tr key={item.id} className={item.active ? undefined : "opacity-50"}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-semibold text-navy-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.vendor || "—"}</p>
                    {item.notes ? (
                      <p
                        className="mt-0.5 line-clamp-2 max-w-xl text-xs text-slate-400"
                        title={item.notes}
                      >
                        {item.notes}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-600">
                    {item.plan === "free" ? planBadge(item) : item.cycle}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {item.plan === "free" ? "—" : money(item.amountMinor, item.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy-900">
                    {money(monthlyEquivalentMinor(item, rate))}
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-slate-600">{item.category}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{item.nextRenewal ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">{recurringActions(item)}</div>
                  </td>
                </tr>
              ))}
              {data.recurring.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    Nothing yet. Add UpCloud, Supabase, Neon, GitHub and Cloudflare — free plans too,
                    so you can see what you are not paying for.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* The same seven columns cannot be squeezed, so each bill is a card. */}
        <ul className="mt-2 divide-y divide-slate-100 @4xl:hidden">
          {data.recurring.map((item) => (
            <li key={item.id} className={`py-4 ${item.active ? "" : "opacity-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold break-words text-navy-900">{item.name}</p>
                  <p className="text-xs break-words text-slate-500">{item.vendor || "—"}</p>
                </div>
                {item.plan === "free" ? (
                  <span className="shrink-0">{planBadge(item)}</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {item.cycle}
                  </span>
                )}
              </div>

              {item.notes ? (
                <p className="mt-1.5 line-clamp-3 text-xs break-words text-slate-400">{item.notes}</p>
              ) : null}

              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
                <RowField
                  label="Billed"
                  value={item.plan === "free" ? "—" : money(item.amountMinor, item.currency)}
                  tone="muted"
                />
                <RowField
                  label="Per month"
                  value={money(monthlyEquivalentMinor(item, rate))}
                  tone="strong"
                />
                <RowField label="Category" value={item.category || "—"} tone="muted" />
                <RowField label="Renews" value={item.nextRenewal ?? "—"} tone="muted" />
              </dl>

              <div className="mt-2.5">{recurringActions(item)}</div>
            </li>
          ))}
          {data.recurring.length === 0 ? (
            <li className="py-10 text-center text-sm text-slate-500">
              Nothing yet. Add UpCloud, Supabase, Neon, GitHub and Cloudflare — free plans too, so
              you can see what you are not paying for.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Other one-off costs
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Anything that is not a subscription and not a job material — a domain, a permit fee, a
              tool licence. Attach it to a job and it moves into that job&apos;s cost instead.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpenseDraft(expenseDraft ? null : { ...EMPTY_EXPENSE })}
            className={primaryButtonClass}
          >
            {expenseDraft ? "Close" : "+ Add cost"}
          </button>
        </div>

        {expenseDraft ? (
          <div className="mt-4 rounded-2xl border border-solar-300 bg-solar-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="exp-label">
                  What was bought
                </label>
                <input
                  id="exp-label"
                  className={fieldClass}
                  value={expenseDraft.label}
                  placeholder="Domain renewal"
                  onChange={(event) => setExpenseDraft({ ...expenseDraft, label: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="exp-amount">
                  Amount
                </label>
                <input
                  id="exp-amount"
                  className={fieldClass}
                  value={expenseDraft.amount}
                  inputMode="decimal"
                  placeholder="1200"
                  onChange={(event) => setExpenseDraft({ ...expenseDraft, amount: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="exp-category">
                  Category
                </label>
                <select
                  id="exp-category"
                  className={fieldClass}
                  value={expenseDraft.category}
                  onChange={(event) => setExpenseDraft({ ...expenseDraft, category: event.target.value })}
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="exp-date">
                  Date
                </label>
                <input
                  id="exp-date"
                  type="date"
                  className={fieldClass}
                  value={expenseDraft.spentOn}
                  onChange={(event) => setExpenseDraft({ ...expenseDraft, spentOn: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="exp-job">
                  Charge to job
                </label>
                <select
                  id="exp-job"
                  className={fieldClass}
                  value={expenseDraft.jobId}
                  onChange={(event) => setExpenseDraft({ ...expenseDraft, jobId: event.target.value })}
                >
                  <option value="">Overhead, not a job</option>
                  {data.jobs.map((job) => (
                    <option key={job.id} value={String(job.id)}>
                      {job.customer}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void saveExpense()} disabled={busy} className={primaryButtonClass}>
                {busy ? "Saving…" : expenseDraft.id ? "Save changes" : "Add cost"}
              </button>
              <button type="button" onClick={() => setExpenseDraft(null)} className={ghostButtonClass}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <ul className="mt-4 divide-y divide-slate-100">
          {data.expenses.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1 basis-full @xl:basis-0">
                <p className="font-semibold break-words text-navy-900">{item.label}</p>
                <p className="text-xs break-words text-slate-500">
                  {item.spentOn ?? "no date"} · {item.category}
                  {item.jobId
                    ? ` · charged to ${jobById.get(item.jobId)?.customer ?? `job #${item.jobId}`}`
                    : " · overhead"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums text-navy-900">
                  {money(item.amountMinor, item.currency)}
                </span>
                <button
                  type="button"
                  aria-label="Edit cost"
                  onClick={() => editExpense(item)}
                  className={iconButtonClass}
                >
                  <Icon name="Pencil" className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete cost"
                  onClick={() => void removeRow("expenses", item.id, "cost")}
                  className={`${iconButtonClass} hover:border-red-300 hover:text-red-500`}
                >
                  <Icon name="Trash2" className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
          {data.expenses.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-500">
              No one-off costs recorded. That is normal — most costs are subscriptions or job
              materials.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );

  const jobs = (
    <div className="@container space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">Solar jobs</h3>
            <p className="mt-1 text-xs text-slate-500">
              What you sold it for against what the materials and crew actually cost. A job only
              counts as revenue once it has a closed date.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setJobDraft(jobDraft ? null : { ...EMPTY_JOB, costLines: [{ label: "", amount: "" }] })}
            className={primaryButtonClass}
          >
            {jobDraft ? "Close" : "+ Add job"}
          </button>
        </div>

        {jobDraft ? (
          <div className="mt-4 rounded-2xl border border-solar-300 bg-solar-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="job-customer">
                  Customer
                </label>
                <input
                  id="job-customer"
                  className={fieldClass}
                  value={jobDraft.customer}
                  onChange={(event) => setJobDraft({ ...jobDraft, customer: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="job-location">
                  Location
                </label>
                <input
                  id="job-location"
                  className={fieldClass}
                  value={jobDraft.location}
                  onChange={(event) => setJobDraft({ ...jobDraft, location: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="job-size">
                  Size (kWp)
                </label>
                <input
                  id="job-size"
                  className={fieldClass}
                  value={jobDraft.sizeKwp}
                  inputMode="decimal"
                  placeholder="5.00"
                  onChange={(event) => setJobDraft({ ...jobDraft, sizeKwp: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="job-status">
                  Status
                </label>
                <select
                  id="job-status"
                  className={fieldClass}
                  value={jobDraft.status}
                  onChange={(event) => setJobDraft({ ...jobDraft, status: event.target.value })}
                >
                  {JOB_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="job-sell">
                  Sold for
                </label>
                <input
                  id="job-sell"
                  className={fieldClass}
                  value={jobDraft.sellPrice}
                  inputMode="decimal"
                  placeholder="450000"
                  onChange={(event) => setJobDraft({ ...jobDraft, sellPrice: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="job-closed">
                  Closed / invoiced
                </label>
                <input
                  id="job-closed"
                  type="date"
                  className={fieldClass}
                  value={jobDraft.closedOn}
                  onChange={(event) => setJobDraft({ ...jobDraft, closedOn: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <span className={labelClass}>Cost lines</span>
              <p className="mt-1 text-xs text-slate-500">
                One line per supplier order — panels, inverter, battery, mounting, wiring, crew,
                permits, transport. Enter what the supplier actually charged.
              </p>
              <div className="mt-2 space-y-2">
                {jobDraft.costLines.map((line, index) => (
                  <div
                    key={index}
                    className="grid gap-2 @xl:grid-cols-[minmax(0,1fr)_10rem_auto] @xl:items-center"
                  >
                    <input
                      aria-label="Cost line"
                      className={smallFieldClass}
                      value={line.label}
                      placeholder="Panels — 8 x 550W"
                      onChange={(event) => {
                        const next = [...jobDraft.costLines];
                        next[index] = { ...next[index], label: event.target.value };
                        setJobDraft({ ...jobDraft, costLines: next });
                      }}
                    />
                    <input
                      aria-label="Amount"
                      className={smallFieldClass}
                      value={line.amount}
                      inputMode="decimal"
                      placeholder="0"
                      onChange={(event) => {
                        const next = [...jobDraft.costLines];
                        next[index] = { ...next[index], amount: event.target.value };
                        setJobDraft({ ...jobDraft, costLines: next });
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Remove cost line"
                      onClick={() =>
                        setJobDraft({
                          ...jobDraft,
                          costLines:
                            jobDraft.costLines.length > 1
                              ? jobDraft.costLines.filter((_, i) => i !== index)
                              : [{ label: "", amount: "" }],
                        })
                      }
                      className={`${iconButtonClass} justify-self-end hover:border-red-300 hover:text-red-500`}
                    >
                      <Icon name="X" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setJobDraft({ ...jobDraft, costLines: [...jobDraft.costLines, { label: "", amount: "" }] })
                }
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-solar-600 transition hover:text-solar-500"
              >
                <Icon name="Plus" className="h-3.5 w-3.5" /> Add cost line
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Cost so far
                </p>
                <p className="mt-1 text-lg font-extrabold text-navy-900">
                  {money(jobDraft.costLines.reduce((sum, line) => sum + toMinor(line.amount), 0))}
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Gross profit
                </p>
                <p className="mt-1 text-lg font-extrabold text-emerald-700">
                  {money(
                    toMinor(jobDraft.sellPrice) -
                      jobDraft.costLines.reduce((sum, line) => sum + toMinor(line.amount), 0),
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void saveJob()} disabled={busy} className={primaryButtonClass}>
                {busy ? "Saving…" : jobDraft.id ? "Save changes" : "Add job"}
              </button>
              <button type="button" onClick={() => setJobDraft(null)} className={ghostButtonClass}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 hidden overflow-x-auto @4xl:block">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Sold for</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Cost</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Profit</th>
                <th className="px-4 py-3 whitespace-nowrap">Closed</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.jobs.map((job) => {
                const cost = jobTotalCostMinor(job, data.expenses, rate);
                const profit = job.sellPriceMinor - cost;
                return (
                  <tr key={job.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">{job.customer}</p>
                      <p className="text-xs text-slate-500">
                        {job.location}
                        {job.sizeKwp ? ` · ${Number(job.sizeKwp)} kWp` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">{statusBadge(job)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {money(job.sellPriceMinor, job.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">{money(cost)}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold tabular-nums ${
                        profit >= 0 ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {money(profit)}
                      {job.sellPriceMinor > 0 ? (
                        <span className="block text-[11px] font-semibold text-slate-400">
                          {percent((profit / job.sellPriceMinor) * 100)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{job.closedOn ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">{jobActions(job)}</div>
                    </td>
                  </tr>
                );
              })}
              {data.jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No jobs yet. Add one when you quote, and fill in the cost lines when the supplier
                    invoices come in.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <ul className="mt-2 divide-y divide-slate-100 @4xl:hidden">
          {data.jobs.map((job) => {
            const cost = jobTotalCostMinor(job, data.expenses, rate);
            const profit = job.sellPriceMinor - cost;
            return (
              <li key={job.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold break-words text-navy-900">{job.customer}</p>
                    <p className="text-xs break-words text-slate-500">
                      {job.location}
                      {job.sizeKwp ? ` · ${Number(job.sizeKwp)} kWp` : ""}
                    </p>
                  </div>
                  <span className="shrink-0">{statusBadge(job)}</span>
                </div>

                <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <RowField
                    label="Sold for"
                    value={money(job.sellPriceMinor, job.currency)}
                    tone="strong"
                  />
                  <RowField label="Cost" value={money(cost)} tone="muted" />
                  <RowField
                    label="Profit"
                    value={
                      <>
                        {money(profit)}
                        {job.sellPriceMinor > 0 ? (
                          <span className="ml-1 text-[11px] font-semibold text-slate-400">
                            {percent((profit / job.sellPriceMinor) * 100)}
                          </span>
                        ) : null}
                      </>
                    }
                    tone={profit >= 0 ? "good" : "bad"}
                  />
                  <RowField label="Closed" value={job.closedOn ?? "—"} tone="muted" />
                </dl>

                <div className="mt-2.5">{jobActions(job)}</div>
              </li>
            );
          })}
          {data.jobs.length === 0 ? (
            <li className="py-10 text-center text-sm text-slate-500">
              No jobs yet. Add one when you quote, and fill in the cost lines when the supplier
              invoices come in.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );

  const marketing = (
    <div className="@container space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Marketing — {periodLabel(period)}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Leave the campaign blank for the month&apos;s overall budget, or name a campaign to
              track it separately. Planned against actual is the whole point.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMarketingDraft(marketingDraft ? null : emptyMarketing(period))}
            className={primaryButtonClass}
          >
            {marketingDraft ? "Close" : "+ Add budget or campaign"}
          </button>
        </div>

        {marketingDraft ? (
          <div className="mt-4 rounded-2xl border border-solar-300 bg-solar-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass} htmlFor="mk-period">
                  Month
                </label>
                <input
                  id="mk-period"
                  type="month"
                  className={fieldClass}
                  value={marketingDraft.period}
                  onChange={(event) => setMarketingDraft({ ...marketingDraft, period: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="mk-campaign">
                  Campaign (optional)
                </label>
                <input
                  id="mk-campaign"
                  className={fieldClass}
                  value={marketingDraft.campaign}
                  placeholder="Leave blank for the monthly budget"
                  onChange={(event) => setMarketingDraft({ ...marketingDraft, campaign: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="mk-planned">
                  Planned
                </label>
                <input
                  id="mk-planned"
                  className={fieldClass}
                  value={marketingDraft.planned}
                  inputMode="decimal"
                  placeholder="10000"
                  onChange={(event) => setMarketingDraft({ ...marketingDraft, planned: event.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="mk-actual">
                  Actually spent
                </label>
                <input
                  id="mk-actual"
                  className={fieldClass}
                  value={marketingDraft.actual}
                  inputMode="decimal"
                  placeholder="6500"
                  onChange={(event) => setMarketingDraft({ ...marketingDraft, actual: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="mk-notes">
                  Notes
                </label>
                <textarea
                  id="mk-notes"
                  rows={3}
                  className={textAreaClass}
                  value={marketingDraft.notes}
                  placeholder="Facebook boost, flyers, referral fee…"
                  onChange={(event) => setMarketingDraft({ ...marketingDraft, notes: event.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void saveMarketing()}
                disabled={busy || !isValidPeriod(marketingDraft.period)}
                className={primaryButtonClass}
              >
                {busy ? "Saving…" : marketingDraft.id ? "Save changes" : "Add"}
              </button>
              <button type="button" onClick={() => setMarketingDraft(null)} className={ghostButtonClass}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
          <div className="flex flex-col gap-1 @xl:flex-row @xl:items-center @xl:justify-between @xl:gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              This month
            </span>
            <span className="text-sm font-bold text-navy-900">
              {money(summary.marketingActualMinor)} spent of {money(summary.marketingPlannedMinor)} planned
              {summary.marketingPlannedMinor > 0 ? (
                <span
                  className={`ml-2 text-[11px] font-semibold uppercase tracking-wider ${
                    summary.marketingActualMinor > summary.marketingPlannedMinor
                      ? "text-red-600"
                      : "text-emerald-700"
                  }`}
                >
                  {summary.marketingActualMinor > summary.marketingPlannedMinor
                    ? `over by ${money(summary.marketingActualMinor - summary.marketingPlannedMinor)}`
                    : `under by ${money(summary.marketingPlannedMinor - summary.marketingActualMinor)}`}
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-slate-100">
          {monthMarketing.map((item) => {
            const variance = item.plannedMinor - item.actualMinor;
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 py-3.5">
                <div className="min-w-0 flex-1 basis-full @xl:basis-0">
                  <p className="font-semibold break-words text-navy-900">
                    {item.campaign || "Monthly budget"}
                  </p>
                  <p className="line-clamp-2 text-xs break-words text-slate-500" title={item.notes || undefined}>
                    {item.notes || "-"}
                  </p>
                </div>
                <div className="text-xs text-slate-500 @xl:text-right">
                  <p>planned {money(item.plannedMinor, item.currency)}</p>
                  <p>spent {money(item.actualMinor, item.currency)}</p>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums @xl:w-28 @xl:text-right ${
                    variance >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {variance >= 0 ? "+" : ""}
                  {money(variance, item.currency)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Edit marketing row"
                    onClick={() => editMarketing(item)}
                    className={iconButtonClass}
                  >
                    <Icon name="Pencil" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete marketing row"
                    onClick={() => void removeRow("marketing", item.id, "marketing row")}
                    className={`${iconButtonClass} hover:border-red-300 hover:text-red-500`}
                  >
                    <Icon name="Trash2" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
          {monthMarketing.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-500">
              No marketing recorded for {periodLabel(period)}.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );

  return (
    <div className="@container space-y-5">
      {/* Toolbar */}
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className={labelClass} htmlFor="fin-period">
            Month
          </label>
          <input
            id="fin-period"
            type="month"
            className="mt-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            value={period}
            onChange={(event) => setPeriod(event.target.value || initialPeriod)}
          />
        </div>
        {knownPeriods.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5 pb-1">
            {knownPeriods.slice(0, 6).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPeriod(item)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
                  item === period
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {periodLabel(item)}
              </button>
            ))}
          </div>
        ) : null}

        <div className="ml-auto flex items-end gap-2">
          <div>
            <label className={labelClass} htmlFor="fin-rate">
              USD to PHP
            </label>
            <input
              id="fin-rate"
              className="mt-1.5 w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              value={rateDraft}
              inputMode="decimal"
              placeholder="not set"
              onChange={(event) => setRateDraft(event.target.value)}
            />
          </div>
          <button type="button" onClick={() => void saveRate()} disabled={busy} className={ghostButtonClass}>
            Save rate
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
              tab === item.value
                ? "border-navy-900 bg-navy-900 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            <Icon name={item.icon} className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? overview : null}
      {tab === "subscriptions" ? subscriptions : null}
      {tab === "jobs" ? jobs : null}
      {tab === "marketing" ? marketing : null}
    </div>
  );
}
