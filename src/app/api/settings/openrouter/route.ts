import { getSessionUser } from "@/lib/auth";
import { apiKeySource, hasApiKey, maskedApiKey } from "@/lib/openrouter";
import {
  clearStoredApiKey,
  DEFAULT_OPENROUTER_CONFIG,
  getModelCache,
  getOpenRouterConfig,
  saveOpenRouterConfig,
  saveStoredApiKey,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [config, cache, maskedKey, keyConfigured, keySource] = await Promise.all([
    getOpenRouterConfig(),
    getModelCache(),
    maskedApiKey(),
    hasApiKey(),
    apiKeySource(),
  ]);

  // NOTE: only the masked key ever leaves the server.
  return Response.json({
    config,
    maskedKey,
    keyConfigured,
    keySource,
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
    apiKey: string;
  }>;

  // --- API key: its own field, so saving the config can never clear it -----
  let keyMessage: string | undefined;
  if (typeof body.apiKey === "string") {
    const candidate = body.apiKey.trim();
    if (candidate === "") {
      await clearStoredApiKey();
      keyMessage = "Stored key cleared.";
    } else if (!candidate.startsWith("sk-or-") || candidate.length < 20) {
      return Response.json(
        { error: "That does not look like an OpenRouter key. They begin with sk-or-." },
        { status: 422 },
      );
    } else {
      await saveStoredApiKey(candidate);
      keyMessage = "Key saved — encrypted in Postgres, never sent to the browser.";
    }
  }

  // Only fields actually present in the body are changed, so a partial PUT
  // (e.g. key-only) cannot silently reset the model selection.
  const current = await getOpenRouterConfig();
  const next = { ...current };

  if (typeof body.freeModel === "string" && body.freeModel.trim()) {
    next.freeModel = body.freeModel.trim().slice(0, 120);
  }
  if (typeof body.paidModel === "string" && body.paidModel.trim()) {
    next.paidModel = body.paidModel.trim().slice(0, 120);
  }
  if (body.preferred === "paid" || body.preferred === "free") {
    next.preferred = body.preferred;
  }
  if (typeof body.temperature === "number" && body.temperature >= 0 && body.temperature <= 1) {
    next.temperature = body.temperature;
  }
  if (typeof body.siteTitle === "string" && body.siteTitle.trim()) {
    next.siteTitle = body.siteTitle.trim().slice(0, 80) || DEFAULT_OPENROUTER_CONFIG.siteTitle;
  }

  await saveOpenRouterConfig(next);

  const [maskedKey, keyConfigured, keySource] = await Promise.all([
    maskedApiKey(),
    hasApiKey(),
    apiKeySource(),
  ]);

  return Response.json({
    ok: true,
    config: next,
    maskedKey,
    keyConfigured,
    keySource,
    keyMessage,
  });
}
