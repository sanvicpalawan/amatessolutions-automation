import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { finExpenses, finJobs, finMarketing, finRecurring } from "@/db/schema";
import {
  EXPENSE_CATEGORIES,
  JOB_STATUSES,
  RECURRING_CATEGORIES,
  RECURRING_CYCLES,
  RECURRING_PLANS,
  isValidPeriod,
  type ExpenseItem,
  type FinanceData,
  type JobCostLine,
  type JobItem,
  type MarketingItem,
  type RecurringItem,
} from "@/lib/finance-model";
import { getFinanceConfig, saveFinanceConfig } from "@/lib/settings";

/**
 * Server data layer for the finance backoffice.
 *
 * Four small collections — recurring subscriptions, solar jobs, marketing, and
 * one-off costs — plus the exchange rate. All money crossing this boundary is
 * whole minor units (centavos); see `src/lib/money.ts`.
 */

export const FINANCE_KINDS = ["recurring", "jobs", "marketing", "expenses"] as const;
export type FinanceKind = (typeof FINANCE_KINDS)[number];

export function isFinanceKind(value: string): value is FinanceKind {
  return (FINANCE_KINDS as readonly string[]).includes(value);
}

type Fields = Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * Field sanitisers. Everything arrives from a form, so nothing is trusted.
 * ------------------------------------------------------------------ */

function text(value: unknown, fallback = "", max = 200): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pick<T extends readonly string[]>(
  options: T,
  value: unknown,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

function currencyOf(value: unknown): string {
  return value === "USD" ? "USD" : "PHP";
}

/** Whole centavos, never negative, capped below the integer column's ceiling. */
function minorOf(value: unknown): number {
  const amount = Math.round(Number(value) || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.min(amount, 2_000_000_000);
}

function dateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function numericOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

function costLinesOf(value: unknown): JobCostLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const record = (entry ?? {}) as Fields;
      return {
        label: text(record.label, "", 120),
        amountMinor: minorOf(record.amountMinor),
      };
    })
    .filter((line) => line.label.length > 0 || line.amountMinor > 0)
    .slice(0, 40);
}

/* ------------------------------------------------------------------ *
 * Read
 * ------------------------------------------------------------------ */

export async function listFinance(): Promise<FinanceData> {
  const [config, recurringRows, jobRows, marketingRows, expenseRows] = await Promise.all([
    getFinanceConfig(),
    db
      .select()
      .from(finRecurring)
      .orderBy(desc(finRecurring.active), asc(finRecurring.name)),
    db.select().from(finJobs).orderBy(desc(finJobs.closedOn), desc(finJobs.createdAt)),
    db.select().from(finMarketing).orderBy(desc(finMarketing.period), asc(finMarketing.campaign)),
    db.select().from(finExpenses).orderBy(desc(finExpenses.spentOn), desc(finExpenses.createdAt)),
  ]);

  const recurring: RecurringItem[] = recurringRows.map((row) => ({
    id: row.id,
    name: row.name,
    vendor: row.vendor,
    amountMinor: row.amountMinor,
    currency: row.currency,
    cycle: row.cycle,
    plan: row.plan,
    category: row.category,
    nextRenewal: row.nextRenewal ?? null,
    active: row.active,
    notes: row.notes,
  }));

  const jobs: JobItem[] = jobRows.map((row) => ({
    id: row.id,
    customer: row.customer,
    location: row.location,
    sizeKwp: row.sizeKwp ?? null,
    status: row.status,
    sellPriceMinor: row.sellPriceMinor,
    currency: row.currency,
    costLines: costLinesOf(row.costLines),
    closedOn: row.closedOn ?? null,
    leadId: row.leadId ?? null,
    notes: row.notes,
  }));

  const marketing: MarketingItem[] = marketingRows.map((row) => ({
    id: row.id,
    period: row.period,
    campaign: row.campaign,
    plannedMinor: row.plannedMinor,
    actualMinor: row.actualMinor,
    currency: row.currency,
    notes: row.notes,
  }));

  const expenses: ExpenseItem[] = expenseRows.map((row) => ({
    id: row.id,
    label: row.label,
    amountMinor: row.amountMinor,
    currency: row.currency,
    category: row.category,
    spentOn: row.spentOn ?? null,
    jobId: row.jobId ?? null,
    notes: row.notes,
  }));

  return {
    usdToPhp: Number(config.usdToPhp) || 0,
    recurring,
    jobs,
    marketing,
    expenses,
  };
}

export async function saveExchangeRate(usdToPhp: number): Promise<void> {
  const rate = Number(usdToPhp);
  await saveFinanceConfig({
    usdToPhp: Number.isFinite(rate) && rate > 0 ? Math.round(rate * 10000) / 10000 : 0,
  });
}

/* ------------------------------------------------------------------ *
 * Write
 *
 * Updates merge the incoming body over the stored row and rewrite the whole
 * record. The admin board always PATCHes a complete object, so this keeps one
 * sanitiser per collection instead of two.
 * ------------------------------------------------------------------ */

function recurringValues(body: Fields) {
  const plan = pick(RECURRING_PLANS, body.plan, "paid");
  return {
    name: text(body.name, "", 120) || "Untitled subscription",
    vendor: text(body.vendor, "", 120),
    // A free plan carries no cost by definition, so the label and the number
    // cannot disagree.
    amountMinor: plan === "free" ? 0 : minorOf(body.amountMinor),
    currency: currencyOf(body.currency),
    cycle: pick(RECURRING_CYCLES, body.cycle, "monthly"),
    plan,
    category: pick(RECURRING_CATEGORIES, body.category, "other"),
    nextRenewal: dateOrNull(body.nextRenewal),
    active: bool(body.active, true),
    notes: text(body.notes, "", 2000),
    updatedAt: new Date(),
  };
}

function jobValues(body: Fields) {
  return {
    customer: text(body.customer, "", 140) || "Untitled job",
    location: text(body.location, "", 120) || "Palawan",
    sizeKwp: numericOrNull(body.sizeKwp),
    status: pick(JOB_STATUSES, body.status, "quoted"),
    sellPriceMinor: minorOf(body.sellPriceMinor),
    currency: currencyOf(body.currency),
    costLines: costLinesOf(body.costLines),
    closedOn: dateOrNull(body.closedOn),
    leadId: Number.isInteger(Number(body.leadId)) && Number(body.leadId) > 0 ? Number(body.leadId) : null,
    notes: text(body.notes, "", 4000),
    updatedAt: new Date(),
  };
}

function marketingValues(body: Fields) {
  const period = text(body.period, "", 7);
  return {
    period: isValidPeriod(period) ? period : "",
    campaign: text(body.campaign, "", 140),
    plannedMinor: minorOf(body.plannedMinor),
    actualMinor: minorOf(body.actualMinor),
    currency: currencyOf(body.currency),
    notes: text(body.notes, "", 2000),
    updatedAt: new Date(),
  };
}

function expenseValues(body: Fields) {
  return {
    label: text(body.label, "", 160) || "Untitled cost",
    amountMinor: minorOf(body.amountMinor),
    currency: currencyOf(body.currency),
    category: pick(EXPENSE_CATEGORIES, body.category, "other"),
    spentOn: dateOrNull(body.spentOn),
    jobId: Number.isInteger(Number(body.jobId)) && Number(body.jobId) > 0 ? Number(body.jobId) : null,
    notes: text(body.notes, "", 2000),
  };
}

export async function createFinanceItem(kind: FinanceKind, body: Fields): Promise<number> {
  switch (kind) {
    case "recurring": {
      const [row] = await db.insert(finRecurring).values(recurringValues(body)).returning({ id: finRecurring.id });
      return row.id;
    }
    case "jobs": {
      const [row] = await db.insert(finJobs).values(jobValues(body)).returning({ id: finJobs.id });
      return row.id;
    }
    case "marketing": {
      const values = marketingValues(body);
      if (!values.period) throw new Error("Pick a month for this marketing row.");
      const [row] = await db.insert(finMarketing).values(values).returning({ id: finMarketing.id });
      return row.id;
    }
    case "expenses": {
      const [row] = await db.insert(finExpenses).values(expenseValues(body)).returning({ id: finExpenses.id });
      return row.id;
    }
  }
}

export async function updateFinanceItem(
  kind: FinanceKind,
  id: number,
  body: Fields,
): Promise<boolean> {
  switch (kind) {
    case "recurring": {
      const [row] = await db.select().from(finRecurring).where(eq(finRecurring.id, id)).limit(1);
      if (!row) return false;
      const merged = { ...row, ...body };
      const written = await db
        .update(finRecurring)
        .set(recurringValues(merged))
        .where(eq(finRecurring.id, id))
        .returning({ id: finRecurring.id });
      return written.length > 0;
    }
    case "jobs": {
      const [row] = await db.select().from(finJobs).where(eq(finJobs.id, id)).limit(1);
      if (!row) return false;
      const merged = { ...row, ...body };
      const written = await db
        .update(finJobs)
        .set(jobValues(merged))
        .where(eq(finJobs.id, id))
        .returning({ id: finJobs.id });
      return written.length > 0;
    }
    case "marketing": {
      const [row] = await db.select().from(finMarketing).where(eq(finMarketing.id, id)).limit(1);
      if (!row) return false;
      const merged = { ...row, ...body };
      const values = marketingValues(merged);
      if (!values.period) throw new Error("Pick a month for this marketing row.");
      const written = await db
        .update(finMarketing)
        .set(values)
        .where(eq(finMarketing.id, id))
        .returning({ id: finMarketing.id });
      return written.length > 0;
    }
    case "expenses": {
      const [row] = await db.select().from(finExpenses).where(eq(finExpenses.id, id)).limit(1);
      if (!row) return false;
      const merged = { ...row, ...body };
      const written = await db
        .update(finExpenses)
        .set(expenseValues(merged))
        .where(eq(finExpenses.id, id))
        .returning({ id: finExpenses.id });
      return written.length > 0;
    }
  }
}

export async function deleteFinanceItem(kind: FinanceKind, id: number): Promise<boolean> {
  switch (kind) {
    case "recurring": {
      const rows = await db.delete(finRecurring).where(eq(finRecurring.id, id)).returning({ id: finRecurring.id });
      return rows.length > 0;
    }
    case "jobs": {
      // Any expense filed against the job survives with its link cleared —
      // deleting a job must not silently delete a real cost.
      await db.update(finExpenses).set({ jobId: null }).where(eq(finExpenses.jobId, id));
      const rows = await db.delete(finJobs).where(eq(finJobs.id, id)).returning({ id: finJobs.id });
      return rows.length > 0;
    }
    case "marketing": {
      const rows = await db.delete(finMarketing).where(eq(finMarketing.id, id)).returning({ id: finMarketing.id });
      return rows.length > 0;
    }
    case "expenses": {
      const rows = await db.delete(finExpenses).where(eq(finExpenses.id, id)).returning({ id: finExpenses.id });
      return rows.length > 0;
    }
  }
}
