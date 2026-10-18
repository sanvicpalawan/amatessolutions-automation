import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/secrets";

export const SETTINGS_KEYS = {
  openrouter: "openrouter_config",
  modelCache: "openrouter_model_cache",
  theme: "site_theme",
  siteContent: "site_content",
  openrouterApiKey: "openrouter_api_key",
} as const;

export type OpenRouterConfig = {
  freeModel: string;
  paidModel: string;
  preferred: "free" | "paid";
  temperature: number;
  siteTitle: string;
};

export type CachedModel = {
  id: string;
  name: string;
  free: boolean;
  contextLength: number;
  promptPrice: string;
};

export type ModelCache = {
  models: CachedModel[];
  refreshedAt: string | null;
  green: boolean;
  message: string;
};

export const DEFAULT_OPENROUTER_CONFIG: OpenRouterConfig = {
  freeModel: "meta-llama/llama-3.3-70b-instruct:free",
  paidModel: "openai/gpt-4o-mini",
  preferred: "free",
  temperature: 0.4,
  siteTitle: "Amates Solutions",
};

export const EMPTY_MODEL_CACHE: ModelCache = {
  models: [],
  refreshedAt: null,
  green: false,
  message: "No model list cached yet. Hit Refresh Models.",
};

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (!rows[0]) return fallback;
    return { ...fallback, ...(rows[0].value as object) } as T;
  } catch {
    return fallback;
  }
}

async function writeSetting<T>(key: string, value: T): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value: value as object, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: value as object, updatedAt: new Date() },
    });
}

export function getOpenRouterConfig(): Promise<OpenRouterConfig> {
  return readSetting(SETTINGS_KEYS.openrouter, DEFAULT_OPENROUTER_CONFIG);
}

export function saveOpenRouterConfig(config: OpenRouterConfig): Promise<void> {
  return writeSetting(SETTINGS_KEYS.openrouter, config);
}

export function getModelCache(): Promise<ModelCache> {
  return readSetting(SETTINGS_KEYS.modelCache, EMPTY_MODEL_CACHE);
}

export function saveModelCache(cache: ModelCache): Promise<void> {
  return writeSetting(SETTINGS_KEYS.modelCache, cache);
}

/* ------------------------------------------------------------------ *
 * Provider API keys — entered in the backoffice, encrypted at rest.
 * ------------------------------------------------------------------ */

/**
 * The key saved through /admin/settings, or null when unset.
 * Returns null (rather than throwing) if the ciphertext cannot be
 * decrypted, so a rotated secret degrades to "key missing".
 */
export async function getStoredApiKey(): Promise<string | null> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEYS.openrouterApiKey))
      .limit(1);
    const value = rows[0]?.value as { ciphertext?: string } | undefined;
    return decryptSecret(value?.ciphertext);
  } catch {
    return null;
  }
}

export async function saveStoredApiKey(key: string): Promise<void> {
  await writeSetting(SETTINGS_KEYS.openrouterApiKey, {
    ciphertext: encryptSecret(key),
    addedAt: new Date().toISOString(),
  });
}

/** Removes the admin-stored key. An `OPENROUTER_API_KEY` env var is untouched. */
export async function clearStoredApiKey(): Promise<void> {
  await db.delete(settings).where(eq(settings.key, SETTINGS_KEYS.openrouterApiKey));
}
