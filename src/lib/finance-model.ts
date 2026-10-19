/**
 * Finance types and the profit maths.
 *
 * Kept separate from `finance.ts` (which is `server-only`) so the admin board
 * can recompute a month's P&L instantly when the owner changes the month,
 * without a round trip and without a second copy of the arithmetic.
 *
 * Everything here is pure.
 */

import { toPhp } from "@/lib/money";

export type RecurringItem = {
  id: number;
  name: string;
  vendor: string;
  amountMinor: number;
  currency: string;
  cycle: string;
  plan: string;
  category: string;
  nextRenewal: string | null;
  active: boolean;
  notes: string;
};

export type JobCostLine = { label: string; amountMinor: number };

export type JobItem = {
  id: number;
  customer: string;
  location: string;
  sizeKwp: string | null;
  status: string;
  sellPriceMinor: number;
  currency: string;
  costLines: JobCostLine[];
  closedOn: string | null;
  leadId: number | null;
  notes: string;
};

export type MarketingItem = {
  id: number;
  period: string;
  campaign: string;
  plannedMinor: number;
  actualMinor: number;
  currency: string;
  notes: string;
};

export type ExpenseItem = {
  id: number;
  label: string;
  amountMinor: number;
  currency: string;
  category: string;
  spentOn: string | null;
  jobId: number | null;
  notes: string;
};

export type FinanceData = {
  usdToPhp: number;
  recurring: RecurringItem[];
  jobs: JobItem[];
  marketing: MarketingItem[];
  expenses: ExpenseItem[];
};

export const RECURRING_CYCLES = ["monthly", "quarterly", "yearly"] as const;
export const RECURRING_PLANS = ["free", "paid"] as const;
export const RECURRING_CATEGORIES = [
  "hosting",
  "backend",
  "dev tools",
  "domain",
  "email",
  "other",
] as const;
export const JOB_STATUSES = ["quoted", "won", "installing", "completed", "lost"] as const;
export const EXPENSE_CATEGORIES = [
  "materials",
  "permits",
  "transport",
  "tools",
  "fees",
  "other",
] as const;

/** "2026-10-19" or a full timestamp becomes "2026-10". Null becomes "". */
export function periodOf(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).slice(0, 7);
}

/** Today in Manila, as "YYYY-MM". Deterministic regardless of host timezone. */
export function currentPeriod(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

/** "2026-10" becomes "October 2026". */
export function periodLabel(period: string): string {
  if (!isValidPeriod(period)) return period || "—";
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

export function shiftPeriod(period: string, months: number): string {
  if (!isValidPeriod(period)) return period;
  const [year, month] = period.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The `count` periods ending at (and including) `period`, oldest first. */
export function trailingPeriods(period: string, count: number): string[] {
  const list: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    list.push(shiftPeriod(period, -index));
  }
  return list;
}

/** A yearly or quarterly bill expressed as its monthly cost. */
export function monthlyEquivalentMinor(item: RecurringItem, usdToPhp: number): number {
  const amount = toPhp(item.amountMinor, item.currency, usdToPhp);
  if (item.cycle === "yearly") return Math.round(amount / 12);
  if (item.cycle === "quarterly") return Math.round(amount / 4);
  return amount;
}

export function jobCostLinesMinor(job: JobItem, usdToPhp: number): number {
  return job.costLines.reduce((sum, line) => sum + toPhp(line.amountMinor, job.currency, usdToPhp), 0);
}

/** Total cost of one job, including any one-off expense filed against it. */
export function jobTotalCostMinor(
  job: JobItem,
  expenses: ExpenseItem[],
  usdToPhp: number,
): number {
  const extras = expenses
    .filter((expense) => expense.jobId === job.id)
    .reduce((sum, expense) => sum + toPhp(expense.amountMinor, expense.currency, usdToPhp), 0);
  return jobCostLinesMinor(job, usdToPhp) + extras;
}

export type MonthSummary = {
  period: string;
  revenueMinor: number;
  jobCostMinor: number;
  grossMinor: number;
  grossMarginPct: number;
  recurringMinor: number;
  marketingPlannedMinor: number;
  marketingActualMinor: number;
  otherCostMinor: number;
  overheadMinor: number;
  netMinor: number;
  jobs: JobItem[];
  /** True when a foreign amount exists but no exchange rate is set. */
  needsRate: boolean;
};

export function monthSummary(data: FinanceData, period: string): MonthSummary {
  const rate = data.usdToPhp;
  const jobs = data.jobs.filter((job) => periodOf(job.closedOn) === period);
  const jobIdsInMonth = new Set(jobs.map((job) => job.id));

  let revenueMinor = 0;
  let jobCostMinor = 0;
  for (const job of jobs) {
    revenueMinor += toPhp(job.sellPriceMinor, job.currency, rate);
    jobCostMinor += jobTotalCostMinor(job, data.expenses, rate);
  }

  const activeRecurring = data.recurring.filter((item) => item.active);
  const recurringMinor = activeRecurring.reduce(
    (sum, item) => sum + monthlyEquivalentMinor(item, rate),
    0,
  );

  const monthMarketing = data.marketing.filter((row) => row.period === period);
  const marketingPlannedMinor = monthMarketing.reduce(
    (sum, row) => sum + toPhp(row.plannedMinor, row.currency, rate),
    0,
  );
  const marketingActualMinor = monthMarketing.reduce(
    (sum, row) => sum + toPhp(row.actualMinor, row.currency, rate),
    0,
  );

  let otherCostMinor = 0;
  for (const expense of data.expenses) {
    if (expense.jobId !== null) {
      // Already counted inside the job, and only when that job is in this month.
      if (jobIdsInMonth.has(expense.jobId)) jobCostMinor += toPhp(expense.amountMinor, expense.currency, rate);
      continue;
    }
    if (periodOf(expense.spentOn) === period) {
      otherCostMinor += toPhp(expense.amountMinor, expense.currency, rate);
    }
  }

  const grossMinor = revenueMinor - jobCostMinor;
  const overheadMinor = recurringMinor + marketingActualMinor + otherCostMinor;

  const foreignAmounts = [
    ...data.recurring.map((item) => item.currency),
    ...data.jobs.map((job) => job.currency),
    ...data.marketing.map((row) => row.currency),
    ...data.expenses.map((expense) => expense.currency),
  ];
  const needsRate = !rate && foreignAmounts.some((currency) => currency !== "PHP");

  return {
    period,
    revenueMinor,
    jobCostMinor,
    grossMinor,
    grossMarginPct: revenueMinor > 0 ? (grossMinor / revenueMinor) * 100 : 0,
    recurringMinor,
    marketingPlannedMinor,
    marketingActualMinor,
    otherCostMinor,
    overheadMinor,
    netMinor: grossMinor - overheadMinor,
    jobs,
    needsRate,
  };
}

/** Every month that has any money in it, newest first, plus the current one. */
export function periodsWithData(data: FinanceData, current: string): string[] {
  const seen = new Set<string>([current]);
  for (const job of data.jobs) {
    const period = periodOf(job.closedOn);
    if (isValidPeriod(period)) seen.add(period);
  }
  for (const row of data.marketing) {
    if (isValidPeriod(row.period)) seen.add(row.period);
  }
  for (const expense of data.expenses) {
    const period = periodOf(expense.spentOn);
    if (isValidPeriod(period)) seen.add(period);
  }
  return Array.from(seen).sort((a, b) => b.localeCompare(a));
}
