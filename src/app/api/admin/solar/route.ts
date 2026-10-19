import { getSessionUser } from "@/lib/auth";
import { listSolar } from "@/lib/solar";

export const dynamic = "force-dynamic";

/** GET /api/admin/solar — every product and package. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  return Response.json(await listSolar());
}
