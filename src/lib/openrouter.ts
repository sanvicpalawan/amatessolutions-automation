/**
 * OpenRouter client — BACKEND ONLY.
 *
 * `import "server-only"` makes the build fail if any client component ever
 * imports this file, so `OPENROUTER_API_KEY` can never leak into frontend JS.
 * The key is read from `.env` at request time and is never serialised into a
 * server-component payload: the admin UI only ever receives a masked preview.
 */
import "server-only";

import {
  getModelCache,
  getOpenRouterConfig,
  getStoredApiKey,
  saveModelCache,
  type CachedModel,
  type ModelCache,
} from "@/lib/settings";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export type ApiKeySource = "env" | "admin" | "none";

/**
 * Resolves the OpenRouter key. The env var wins so production stays
 * env-driven; the key saved in the backoffice is the build-phase fallback.
 */
export async function getApiKey(): Promise<string | undefined> {
  const fromEnv = process.env.OPENROUTER_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const stored = await getStoredApiKey();
  return stored?.trim() || undefined;
}

export async function hasApiKey(): Promise<boolean> {
  return Boolean(await getApiKey());
}

/** Where the active key came from — surfaced in the admin UI. */
export async function apiKeySource(): Promise<ApiKeySource> {
  if (process.env.OPENROUTER_API_KEY?.trim()) return "env";
  return (await getStoredApiKey()) ? "admin" : "none";
}

/** Never returns the raw key — only a masked preview for the admin screen. */
export async function maskedApiKey(): Promise<string> {
  const key = await getApiKey();
  if (!key) return "not set";
  if (key.length <= 10) return `${key.slice(0, 2)}••••••`;
  return `${key.slice(0, 6)}${"•".repeat(14)}${key.slice(-4)}`;
}

async function headers(): Promise<Record<string, string>> {
  const key = await getApiKey();
  return {
    "Content-Type": "application/json",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://amatessolutions.com",
    "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Amates Solutions",
  };
}

type RawModel = {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
};

/** Fetches the live model catalogue and caches it in the `settings` table. */
export async function refreshModels(): Promise<ModelCache> {
  if (!(await hasApiKey())) {
    const cache: ModelCache = {
      models: [],
      refreshedAt: new Date().toISOString(),
      green: false,
      message:
        "No OpenRouter key configured — the agent runs on the offline ROI engine. Add a key in the backoffice settings.",
    };
    await saveModelCache(cache);
    return cache;
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: await headers(),
      cache: "no-store",
    });

    if (!response.ok) {
      const cache: ModelCache = {
        models: [],
        refreshedAt: new Date().toISOString(),
        green: false,
        message: `OpenRouter responded ${response.status}. Check the API key in the backoffice settings.`,
      };
      await saveModelCache(cache);
      return cache;
    }

    const payload = (await response.json()) as { data?: RawModel[] };
    const models: CachedModel[] = (payload.data ?? [])
      .map((model) => {
        const prompt = model.pricing?.prompt ?? "0";
        return {
          id: model.id,
          name: model.name ?? model.id,
          free: model.id.endsWith(":free") || Number(prompt) === 0,
          contextLength: model.context_length ?? 0,
          promptPrice: prompt,
        };
      })
      .sort((a, b) => Number(b.free) - Number(a.free) || a.id.localeCompare(b.id));

    const cache: ModelCache = {
      models,
      refreshedAt: new Date().toISOString(),
      green: models.length > 0,
      message: `Connected. ${models.length} models available (${models.filter((m) => m.free).length} free).`,
    };
    await saveModelCache(cache);
    return cache;
  } catch (error) {
    const cache: ModelCache = {
      models: [],
      refreshedAt: new Date().toISOString(),
      green: false,
      message: `Could not reach OpenRouter: ${(error as Error).message}`,
    };
    await saveModelCache(cache);
    return cache;
  }
}

export async function modelStatus(): Promise<
  ModelCache & { keyConfigured: boolean; maskedKey: string; keySource: ApiKeySource }
> {
  const [cache, keyConfigured, maskedKey, keySource] = await Promise.all([
    getModelCache(),
    hasApiKey(),
    maskedApiKey(),
    apiKeySource(),
  ]);
  return { ...cache, keyConfigured, maskedKey, keySource };
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatResult =
  | { ok: true; model: string; content: string }
  | { ok: false; model: string; error: string };

/** Single chat-completion call against the configured model. */
export async function chat(messages: ChatMessage[], overrideModel?: string): Promise<ChatResult> {
  const config = await getOpenRouterConfig();
  const model =
    overrideModel ?? (config.preferred === "paid" ? config.paidModel : config.freeModel);

  if (!(await hasApiKey())) {
    return { ok: false, model, error: "No OpenRouter API key configured in the backoffice settings" };
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: await headers(),
      cache: "no-store",
      body: JSON.stringify({
        model,
        temperature: config.temperature,
        max_tokens: 1400,
        messages,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { ok: false, model, error: `OpenRouter ${response.status}: ${text.slice(0, 300)}` };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return { ok: false, model, error: "Empty completion from OpenRouter" };
    return { ok: true, model, content };
  } catch (error) {
    return { ok: false, model, error: (error as Error).message };
  }
}
