import { getSessionUser } from "@/lib/auth";
import { createSolarItem, isSolarKind } from "@/lib/solar";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ kind: string }> };

/** POST /api/admin/solar/[kind] — add a product or a package. */
export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { kind } = await params;
  if (!isSolarKind(kind)) return Response.json({ error: "Unknown collection" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (Object.keys(body).length === 0) {
    return Response.json({ error: "Nothing to save" }, { status: 422 });
  }

  try {
    const id = await createSolarItem(kind, body);
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not save" },
      { status: 422 },
    );
  }
}
