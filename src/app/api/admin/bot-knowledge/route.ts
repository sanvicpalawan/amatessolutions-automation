import { getSessionUser } from "@/lib/auth";
import { getBotKnowledge, resetBotKnowledge, saveBotKnowledge } from "@/lib/bot-knowledge";

export const dynamic = "force-dynamic";

/** GET /api/admin/bot-knowledge — what the bot knows right now. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json({ knowledge: await getBotKnowledge() });
}

/**
 * PUT /api/admin/bot-knowledge — replace it.
 *
 * The body is treated as untrusted and normalised server-side: blank answers
 * fall back to the shipped wording rather than leaving the bot with nothing to
 * say. There is no partial update — the editor always sends the whole document,
 * so a save cannot half-apply.
 */
export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { knowledge?: unknown };
  if (!body.knowledge || typeof body.knowledge !== "object") {
    return Response.json({ error: "`knowledge` object is required" }, { status: 422 });
  }

  return Response.json({ ok: true, knowledge: await saveBotKnowledge(body.knowledge) });
}

/** POST — `{ "action": "reset" }` puts the original wording back. */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "reset") {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  return Response.json({ ok: true, knowledge: await resetBotKnowledge() });
}
