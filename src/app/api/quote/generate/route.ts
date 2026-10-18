import { eq } from "drizzle-orm";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { generateProposal } from "@/lib/agent";
import { requireApiSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/quote/generate   (PROTECTED)
 * Body: { leadId: number, model?: string }
 * Runs the backend AI agent (OpenRouter) and persists a proposal + ROI.
 */
export async function POST(request: Request) {
  const unauthorized = await requireApiSession(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => ({}))) as { leadId?: number; model?: string };
  const leadId = Number(body.leadId);
  if (!Number.isInteger(leadId)) {
    return Response.json({ error: "leadId is required" }, { status: 400 });
  }

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

  try {
    const proposal = await generateProposal(lead, body.model);
    if (lead.status === "new" || lead.status === "contacted") {
      await db
        .update(leads)
        .set({ status: "proposal_sent", updatedAt: new Date() })
        .where(eq(leads.id, leadId));
    }
    return Response.json({ ok: true, ...proposal });
  } catch (error) {
    return Response.json(
      { error: "Agent failed", detail: (error as Error).message },
      { status: 500 },
    );
  }
}
