import { getSessionUser } from "@/lib/auth";
import { addComment, deleteComment } from "@/lib/notes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/notes/[id]/comments — a partner replies on a note. */
export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const noteId = Number((await params).id);
  if (!Number.isInteger(noteId)) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return Response.json({ error: "Write something first." }, { status: 422 });

  const comment = await addComment(
    noteId,
    typeof body.author === "string" ? body.author : "Partner",
    text,
  );
  if (!comment) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true, comment }, { status: 201 });
}

/** DELETE /api/admin/notes/[id]/comments?commentId=123 — remove a comment. */
export async function DELETE(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const noteId = Number((await params).id);
  const commentId = Number(new URL(request.url).searchParams.get("commentId"));
  if (!Number.isInteger(noteId) || !Number.isInteger(commentId)) {
    return Response.json({ error: "Bad id" }, { status: 400 });
  }

  const ok = await deleteComment(noteId, commentId);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}
