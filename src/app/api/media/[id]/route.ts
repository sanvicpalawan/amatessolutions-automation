import { eq } from "drizzle-orm";

import { db } from "@/db";
import { mediaAssets } from "@/db/schema";

export const dynamic = "force-dynamic";

/** GET /api/media/[id] — streams an uploaded image out of Postgres. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId)) {
    return new Response("Bad id", { status: 400 });
  }

  const [row] = await db
    .select({ data: mediaAssets.data, mime: mediaAssets.mime, name: mediaAssets.name })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, mediaId))
    .limit(1);

  if (!row?.data) return new Response("Not found", { status: 404 });

  const bytes = Buffer.from(row.data, "base64");
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": row.mime || "image/jpeg",
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${row.name.replace(/"/g, "")}"`,
    },
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const token = store.get("amates_admin_session")?.value;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Reuse the shared session validator without importing the cookie twice.
  const { getSessionUser } = await import("@/lib/auth");
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const mediaId = Number(id);
  if (!Number.isInteger(mediaId)) return Response.json({ error: "Bad id" }, { status: 400 });

  await db.delete(mediaAssets).where(eq(mediaAssets.id, mediaId));
  return Response.json({ ok: true });
}
