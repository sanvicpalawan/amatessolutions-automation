import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { leads, proposals } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { LEAD_STATUSES } from "@/lib/knowledge";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) return Response.json({ error: "Bad id" }, { status: 400 });

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return Response.json({ error: "Not found" }, { status: 404 });

  const leadProposals = await db
    .select()
    .from(proposals)
    .where(eq(proposals.leadId, leadId))
    .orderBy(desc(proposals.createdAt));

  return Response.json({ lead, proposals: leadProposals });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as { status?: string; notes?: string };
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (body.status) {
    if (!(LEAD_STATUSES as readonly string[]).includes(body.status)) {
      return Response.json({ error: "Invalid status" }, { status: 422 });
    }
    update.status = body.status;
  }
  if (typeof body.notes === "string") update.notes = body.notes.slice(0, 2000);

  const [row] = await db.update(leads).set(update).where(eq(leads.id, leadId)).returning();
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, lead: row });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId)) return Response.json({ error: "Bad id" }, { status: 400 });

  await db.delete(leads).where(eq(leads.id, leadId));
  return Response.json({ ok: true });
}
