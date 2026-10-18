/**
 * Conversation state for the agent.
 *
 * The WhatsApp webhook used to insert a brand-new lead for every inbound
 * message, so a guest who sent three messages became three unrelated leads and
 * the agent had no history to answer from — it could not tell that it had
 * already quoted, or that it was repeating itself.
 *
 * This module is the fix, and it keeps one rule: the log records what actually
 * happened. A reply that was never delivered is stored as `skipped`, not `sent`.
 */
import "server-only";

import { and, asc, desc, eq, notInArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { leads, messages, type Lead, type Message } from "@/db/schema";

/** A closed deal must not swallow a fresh enquiry from the same number. */
const TERMINAL_STATUSES = ["won", "lost"];

export type DeliveryStatus = "received" | "sent" | "skipped" | "error";

/** Digits only, so "+63 917 000 0000" and "639170000000" are the same person. */
export function phoneKey(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

/**
 * The most recent lead from this number that is still in play, or null.
 *
 * Matches on digits rather than the stored string, because the web form and the
 * WhatsApp webhook record the same number differently. The comparison runs in
 * Postgres so it stays correct as the lead table grows.
 */
export async function findOpenLeadByPhone(phone: string): Promise<Lead | null> {
  const key = phoneKey(phone);
  if (key.length < 7) return null;

  const rows = await db
    .select()
    .from(leads)
    .where(
      and(
        sql`regexp_replace(${leads.contactWhatsapp}, '[^0-9]', '', 'g') = ${key}`,
        notInArray(leads.status, TERMINAL_STATUSES),
      ),
    )
    .orderBy(desc(leads.updatedAt))
    .limit(1);

  return rows[0] ?? null;
}

/** True if this inbound message was already handled — Meta retries webhooks. */
export async function alreadySeen(externalId: string | null | undefined): Promise<boolean> {
  if (!externalId) return false;
  const rows = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.externalId, externalId))
    .limit(1);
  return rows.length > 0;
}

export type LoggedMessage = {
  leadId: number;
  direction: "inbound" | "outbound";
  channel?: string;
  body: string;
  deliveryStatus?: DeliveryStatus;
  /** WhatsApp WAMID. Unique, so a retried webhook cannot double-log. */
  externalId?: string | null;
  meta?: Record<string, unknown> | null;
};

/** Appends a message to the thread. Returns false when it was a duplicate. */
export async function logMessage(input: LoggedMessage): Promise<boolean> {
  const inserted = await db
    .insert(messages)
    .values({
      leadId: input.leadId,
      direction: input.direction,
      channel: input.channel ?? "whatsapp",
      body: input.body.slice(0, 8000),
      deliveryStatus:
        input.deliveryStatus ?? (input.direction === "inbound" ? "received" : "sent"),
      externalId: input.externalId ?? null,
      meta: input.meta ?? null,
    })
    .onConflictDoNothing({ target: messages.externalId })
    .returning({ id: messages.id });

  return inserted.length > 0;
}

/** The recent back-and-forth, oldest first, for grounding the next reply. */
export async function conversationHistory(leadId: number, limit = 12): Promise<Message[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.leadId, leadId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

/**
 * Facts a later message reveals that we did not have before.
 *
 * A returning guest typically says "hi" first and only then mentions the resort
 * and the load. This fills those gaps without ever overwriting something the
 * customer already told us — a wrong overwrite is worse than a missing field.
 */
export function newFactsOnly(current: Lead, incoming: Partial<Lead>): Partial<Lead> {
  const patch: Record<string, unknown> = {};
  const blank = (value: unknown) => value === undefined || value === null || value === "";

  // Plain gaps: fill only when we hold nothing at all.
  if (blank(current.contactEmail) && !blank(incoming.contactEmail)) {
    patch.contactEmail = incoming.contactEmail;
  }
  if (blank(current.energyUsageKwh) && !blank(incoming.energyUsageKwh)) {
    patch.energyUsageKwh = incoming.energyUsageKwh;
  }
  if (blank(current.monthlyBillPhp) && !blank(incoming.monthlyBillPhp)) {
    patch.monthlyBillPhp = incoming.monthlyBillPhp;
  }

  // These columns are NOT NULL with a default, so an unset value is
  // indistinguishable from the default. Replace it only when the message says
  // something different — never downgrade "resort" back to "residential".
  const upgrade = (key: "propertyType" | "gridState" | "location" | "timeline", fallback: string) => {
    const next = incoming[key];
    if (typeof next === "string" && next && current[key] === fallback && next !== fallback) {
      patch[key] = next;
    }
  };
  upgrade("propertyType", "residential");
  upgrade("gridState", "stable");
  upgrade("location", "Puerto Princesa");
  upgrade("timeline", "exploring");

  // A lead created from a message with no name is stored as "WhatsApp 1234"; a
  // later message that gives a real name should replace it.
  if (!blank(incoming.contactName) && current.contactName.startsWith("WhatsApp ")) {
    patch.contactName = incoming.contactName;
  }

  return patch as Partial<Lead>;
}

/** Applies {@link newFactsOnly} and returns the refreshed lead. */
export async function absorbNewFacts(lead: Lead, incoming: Partial<Lead>): Promise<Lead> {
  const patch = newFactsOnly(lead, incoming);
  if (Object.keys(patch).length === 0) {
    await db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, lead.id));
    return lead;
  }

  const [updated] = await db
    .update(leads)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(leads.id, lead.id))
    .returning();

  return updated ?? lead;
}

/** The thread for a lead, oldest first — used by the admin lead detail view. */
export async function threadForLead(leadId: number): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.leadId, leadId))
    .orderBy(asc(messages.createdAt));
}
