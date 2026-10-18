import { getSessionUser } from "@/lib/auth";
import { refreshModels } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

/** POST /api/models/refresh → { status: "ok", green: boolean, models: [...] } */
export async function POST() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const cache = await refreshModels();

  return Response.json({
    status: "ok",
    green: cache.green,
    message: cache.message,
    refreshedAt: cache.refreshedAt,
    models: cache.models,
  });
}
