import { getSessionUser } from "@/lib/auth";
import { maskedApiKey, hasApiKey } from "@/lib/openrouter";
import {
  DEFAULT_OPENROUTER_CONFIG,
  getModelCache,
  getOpenRouterConfig,
  saveOpenRouterConfig,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [config, cache] = await Promise.all([getOpenRouterConfig(), getModelCache()]);
  // NOTE: only the masked key ever leaves the server.
  return Response.json({
    config,
    maskedKey: maskedApiKey(),
    keyConfigured: hasApiKey(),
    green: cache.green,
    refreshedAt: cache.refreshedAt,
    models: cache.models,
  });
}

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Partial<{
    freeModel: string;
    paidModel: string;
    preferred: "free" | "paid";
    temperature: number;
    siteTitle: string;
  }>;

  const current = await getOpenRouterConfig();
  const next = {
    freeModel: body.freeModel?.slice(0, 120) || current.freeModel,
    paidModel: body.paidModel?.slice(0, 120) || current.paidModel,
    preferred: body.preferred === "paid" ? ("paid" as const) : ("free" as const),
    temperature:
      typeof body.temperature === "number" && body.temperature >= 0 && body.temperature <= 1
        ? body.temperature
        : current.temperature,
    siteTitle: body.siteTitle?.slice(0, 80) || current.siteTitle || DEFAULT_OPENROUTER_CONFIG.siteTitle,
  };

  await saveOpenRouterConfig(next);
  return Response.json({ ok: true, config: next });
}
