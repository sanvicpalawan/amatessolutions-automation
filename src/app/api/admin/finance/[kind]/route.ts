import { getSessionUser } from "@/lib/auth";
import { createFinanceItem, isFinanceKind } from "@/lib/finance";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ kind: string }> };

/** POST /api/admin/finance/[kind] — add a subscription, job, marketing row or cost. */
export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { kind } = await params;
  if (!isFinanceKind(kind)) return Response.json({ error: "Unknown collection" }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (Object.keys(body).length === 0) {
    return Response.json({ error: "Nothing to save" }, { status: 422 });
  }

  try {
    const id = await createFinanceItem(kind, body);
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not save" },
      { status: 422 },
    );
  }
}
