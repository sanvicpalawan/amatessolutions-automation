import { getSessionUser } from "@/lib/auth";
import { deleteNote, updateNote, type NoteInput } from "@/lib/notes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/admin/notes/[id] — edit a note, or just flip `pinned`. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const noteId = Number((await params).id);
  if (!Number.isInteger(noteId)) return Response.json({ error: "Bad id" }, { status: 400 });

  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Partial<NoteInput> = {};
  if (typeof raw.title === "string") patch.title = raw.title;
  if (typeof raw.body === "string") patch.body = raw.body;
  if (raw.urls !== undefined) patch.urls = raw.urls;
  if (raw.mediaIds !== undefined) patch.mediaIds = raw.mediaIds;
  if (typeof raw.author === "string") patch.author = raw.author;
  if (typeof raw.pinned === "boolean") patch.pinned = raw.pinned;

  const ok = await updateNote(noteId, patch);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}

/** DELETE /api/admin/notes/[id] — remove a note (and its comments). */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const noteId = Number((await params).id);
  if (!Number.isInteger(noteId)) return Response.json({ error: "Bad id" }, { status: 400 });

  const ok = await deleteNote(noteId);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}
