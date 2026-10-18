import { desc } from "drizzle-orm";

import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

/** GET /api/media — media library (metadata only, no binaries). */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      id: mediaAssets.id,
      name: mediaAssets.name,
      alt: mediaAssets.alt,
      mime: mediaAssets.mime,
      size: mediaAssets.size,
      url: mediaAssets.url,
      folder: mediaAssets.folder,
      createdAt: mediaAssets.createdAt,
    })
    .from(mediaAssets)
    .orderBy(desc(mediaAssets.createdAt));

  return Response.json({
    media: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      src: row.url ?? `/api/media/${row.id}`,
      uploaded: Boolean(row.url === null),
    })),
  });
}

/**
 * POST /api/media — upload from the owner's device.
 * multipart/form-data with a `file` field; bytes are base64-encoded into Postgres
 * so they survive `.next` wipes and redeploys.
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "A `file` field is required" }, { status: 422 });
  }
  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Only image files are accepted" }, { status: 422 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image must be under 4 MB" }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const folder = String(form.get("folder") ?? "uploads").slice(0, 40);

  const [row] = await db
    .insert(mediaAssets)
    .values({
      name: file.name.slice(0, 180),
      alt: String(form.get("alt") ?? "").slice(0, 240),
      mime: file.type,
      size: bytes.length,
      data: bytes.toString("base64"),
      folder,
    })
    .returning({ id: mediaAssets.id, name: mediaAssets.name });

  return Response.json(
    { ok: true, id: row.id, name: row.name, src: `/api/media/${row.id}` },
    { status: 201 },
  );
}
