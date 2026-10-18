import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { appointments, leads } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { ensureSeedData } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSeedData();

  const rows = await db
    .select({
      appointment: appointments,
      leadName: leads.contactName,
    })
    .from(appointments)
    .leftJoin(leads, eq(appointments.leadId, leads.id))
    .orderBy(asc(appointments.scheduledFor));

  return Response.json({ appointments: rows });
}

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    leadId?: number | null;
    title?: string;
    kind?: string;
    scheduledFor?: string;
    crew?: string;
    location?: string;
    notes?: string;
  };

  if (!body.title || !body.scheduledFor) {
    return Response.json({ error: "title and scheduledFor are required" }, { status: 422 });
  }
  const when = new Date(body.scheduledFor);
  if (Number.isNaN(when.getTime())) {
    return Response.json({ error: "scheduledFor must be a valid date" }, { status: 422 });
  }

  const [row] = await db
    .insert(appointments)
    .values({
      leadId: body.leadId ?? null,
      title: body.title.slice(0, 180),
      kind: ["audit", "install", "maintenance"].includes(body.kind ?? "") ? body.kind! : "audit",
      scheduledFor: when,
      crew: body.crew?.slice(0, 80) || "Unassigned",
      location: body.location?.slice(0, 80) || "Palawan",
      notes: body.notes?.slice(0, 1000) ?? null,
    })
    .returning();

  if (row.leadId) {
    await db
      .update(leads)
      .set({ status: "audit_booked", updatedAt: new Date() })
      .where(eq(leads.id, row.leadId));
  }

  return Response.json({ ok: true, appointment: row }, { status: 201 });
}
