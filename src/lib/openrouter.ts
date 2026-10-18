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
  saveModelCache,
  type CachedModel,
  type ModelCache,
} from "@/lib/settings";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export function getApiKey(): string | undefined {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return key && key.length > 0 ? key : undefined;
}

export function hasApiKey(): boolean {
  return Boolean(getApiKey());
}

/** Never returns the raw key — only a masked preview for the admin screen. */
export function maskedApiKey(): string {
  const key = getApiKey();
  if (!key) return "not set";
  if (key.length <= 10) return `${key.slice(0, 2)}••••••`;
  return `${key.slice(0, 6)}${"•".repeat(14)}${key.slice(-4)}`;
}

function headers(): Record<string, string> {
  const key = getApiKey();
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
  if (!hasApiKey()) {
    const cache: ModelCache = {
      models: [],
      refreshedAt: new Date().toISOString(),
      green: false,
      message: "OPENROUTER_API_KEY missing in .env — agent runs on the offline ROI engine.",
    };
    await saveModelCache(cache);
    return cache;
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: headers(),
      cache: "no-store",
    });

    if (!response.ok) {
      const cache: ModelCache = {
        models: [],
        refreshedAt: new Date().toISOString(),
        green: false,
        message: `OpenRouter responded ${response.status}. Check the key in .env.`,
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

export async function modelStatus(): Promise<ModelCache & { keyConfigured: boolean; maskedKey: string }> {
  const cache = await getModelCache();
  return { ...cache, keyConfigured: hasApiKey(), maskedKey: maskedApiKey() };
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

  if (!hasApiKey()) {
    return { ok: false, model, error: "OPENROUTER_API_KEY is not configured in .env" };
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: headers(),
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
