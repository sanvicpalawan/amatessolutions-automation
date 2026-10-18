import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { after } from "next/server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { normalizeLead } from "@/lib/leads";
import { buildAutoReply, runIntakeAutomations, scoreLead } from "@/lib/automation";
import { computeRoi } from "@/lib/roi";
import { ensureSeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";
/** Proposal generation and any outbound acknowledgement run in `after()`. */
export const maxDuration = 60;

/** Admin listing with filter + search (parameterized via Drizzle). */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSeedData();

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const channel = url.searchParams.get("channel") ?? "";
  const search = (url.searchParams.get("q") ?? "").trim();

  const filters = [];
  if (status && status !== "all") filters.push(eq(leads.status, status));
  if (channel && channel !== "all") filters.push(eq(leads.sourceChannel, channel));
  if (search) {
    const needle = `%${search}%`;
    filters.push(
      or(
        ilike(leads.contactName, needle),
        ilike(leads.location, needle),
        ilike(leads.contactWhatsapp, needle),
        ilike(sql`coalesce(${leads.contactEmail}, '')`, needle),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(leads)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(leads.createdAt))
    .limit(200);

  return Response.json({ leads: rows });
}

/** Public intake endpoint used by the website quote form. */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = normalizeLead(payload as Record<string, unknown>, "web_form");
  if (!normalized.ok) {
    return Response.json({ error: "Validation failed", errors: normalized.errors }, { status: 422 });
  }

  const [row] = await db.insert(leads).values(normalized.lead).returning();

  // Instant, client-visible estimate — computed in the browser too, no LLM wait.
  const estimate = computeRoi(row);

  // Run the automation pipeline AFTER the response is sent so the form stays fast.
  after(async () => {
    try {
      await runIntakeAutomations(row);
    } catch (error) {
      console.error("[automation] intake pipeline failed", error);
    }
  });

  return Response.json(
    {
      ok: true,
      leadId: row.id,
      estimate: {
        systemSizeKw: estimate.systemSizeKw,
        batteryKwh: estimate.batteryKwh,
        monthlySavingsPhp: estimate.monthlySavingsPhp,
        paybackYears: estimate.paybackYears,
        estimatedCostPhp: estimate.estimatedCostPhp,
      },
      message:
        "Thank you. Your instant estimate is below and our team will send a personalised solar proposal — free of charge.",
    },
    { status: 201 },
  );
}
