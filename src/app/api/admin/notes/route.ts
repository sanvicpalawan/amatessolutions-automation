import { getSessionUser } from "@/lib/auth";
import { createNote, listNotes } from "@/lib/notes";

export const dynamic = "force-dynamic";

/** GET /api/admin/notes — every note with its images and comments. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json({ notes: await listNotes() });
}

/** POST /api/admin/notes — create a note. */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body : "";

  if (!title && !text.trim() && !(Array.isArray(body.mediaIds) && body.mediaIds.length > 0)) {
    return Response.json(
      { error: "Add a heading, some notes or an image before saving." },
      { status: 422 },
    );
  }

  const id = await createNote({
    title,
    body: text,
    urls: body.urls,
    mediaIds: body.mediaIds,
    author: typeof body.author === "string" ? body.author : undefined,
    pinned: body.pinned === true,
  });

  return Response.json({ ok: true, id }, { status: 201 });
}
