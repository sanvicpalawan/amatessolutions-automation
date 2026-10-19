import { getSessionUser } from "@/lib/auth";
import { deleteSolarItem, isSolarKind, updateSolarItem } from "@/lib/solar";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ kind: string; id: string }> };

/** PATCH /api/admin/solar/[kind]/[id] — edit one product or package. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { kind, id } = await params;
  if (!isSolarKind(kind)) return Response.json({ error: "Unknown collection" }, { status: 404 });

  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId <= 0) {
    return Response.json({ error: "Bad id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (Object.keys(body).length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 422 });
  }

  try {
    const ok = await updateSolarItem(kind, rowId, body);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not save" },
      { status: 422 },
    );
  }
}

/** DELETE /api/admin/solar/[kind]/[id] — remove one product or package. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { kind, id } = await params;
  if (!isSolarKind(kind)) return Response.json({ error: "Unknown collection" }, { status: 404 });

  const rowId = Number(id);
  if (!Number.isInteger(rowId) || rowId <= 0) {
    return Response.json({ error: "Bad id" }, { status: 400 });
  }

  const ok = await deleteSolarItem(kind, rowId);
  if (!ok) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ ok: true });
}
