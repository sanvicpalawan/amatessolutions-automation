import { eq } from "drizzle-orm";

import { db } from "@/db";
import { appointments } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PATCH = crew dispatch hook: assigns a crew and flips status to `dispatched`. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const appointmentId = Number(id);
  if (!Number.isInteger(appointmentId)) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as {
    status?: string;
    crew?: string;
    dispatch?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (body.crew) update.crew = body.crew.slice(0, 80);
  if (body.status && ["scheduled", "dispatched", "completed", "cancelled"].includes(body.status)) {
    update.status = body.status;
  }
  if (body.dispatch) {
    update.status = "dispatched";
    update.dispatchedAt = new Date();
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 422 });
  }

  const [row] = await db
    .update(appointments)
    .set(update)
    .where(eq(appointments.id, appointmentId))
    .returning();

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  // Dispatch hook: in production this POSTs to the field-crew dispatch service.
  const dispatchWebhook = process.env.CREW_DISPATCH_WEBHOOK_URL;
  let dispatchNotified = false;
  if (body.dispatch && dispatchWebhook) {
    try {
      await fetch(dispatchWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment: row }),
      });
      dispatchNotified = true;
    } catch {
      dispatchNotified = false;
    }
  }

  return Response.json({ ok: true, appointment: row, dispatchNotified });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const appointmentId = Number(id);
  if (!Number.isInteger(appointmentId)) return Response.json({ error: "Bad id" }, { status: 400 });
  await db.delete(appointments).where(eq(appointments.id, appointmentId));
  return Response.json({ ok: true });
}
