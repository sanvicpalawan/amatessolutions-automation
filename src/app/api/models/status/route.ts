import { getSessionUser } from "@/lib/auth";
import { modelStatus } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

/** GET /api/models/status → green light state for the admin indicator. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const status = await modelStatus();

  return Response.json({
    status: "ok",
    green: status.green,
    keyConfigured: status.keyConfigured,
    maskedKey: status.maskedKey,
    message: status.message,
    refreshedAt: status.refreshedAt,
    modelCount: status.models.length,
    freeModelCount: status.models.filter((m) => m.free).length,
  });
}
