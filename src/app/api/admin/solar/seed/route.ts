import { getSessionUser } from "@/lib/auth";
import { CatalogueNotEmptyError, loadStarterCatalogue } from "@/lib/solar";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/solar/seed — load the starter catalogue.
 *
 * A static segment wins over `[kind]`, so this is not shadowed by the products
 * and packages routes. Nothing outside the catalogue is touched: on a reset it
 * deletes packages and products only.
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const result = await loadStarterCatalogue(body.reset === true);
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof CatalogueNotEmptyError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not load the catalogue" },
      { status: 422 },
    );
  }
}
