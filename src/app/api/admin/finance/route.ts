import { getSessionUser } from "@/lib/auth";
import { listFinance, saveExchangeRate } from "@/lib/finance";

export const dynamic = "force-dynamic";

/** GET /api/admin/finance — every collection plus the exchange rate. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json(await listFinance());
}

/** PATCH /api/admin/finance — set the USD to PHP rate used for conversions. */
export async function PATCH(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.usdToPhp === undefined) {
    return Response.json({ error: "Nothing to update" }, { status: 422 });
  }

  await saveExchangeRate(Number(body.usdToPhp));
  return Response.json({ ok: true });
}
