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
  whatsapp: "whatsapp_config",
  whatsappAccessToken: "whatsapp_access_token",
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
  // OpenRouter retires free models without notice — llama-3.3-70b:free is already gone.
  // Keep this pointing at a model that is actually in the catalogue.
  freeModel: "nvidia/nemotron-3-super-120b-a12b:free",
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
 * A secret saved through /admin/settings, or null when unset.
 *
 * Returns null (rather than throwing) if the ciphertext cannot be decrypted, so
 * a rotated `ADMIN_SESSION_SECRET` degrades to "not set" instead of breaking the
 * page that reads it.
 */
async function getStoredSecret(key: string): Promise<string | null> {
  try {
    const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    const value = rows[0]?.value as { ciphertext?: string } | undefined;
    return decryptSecret(value?.ciphertext);
  } catch {
    return null;
  }
}

async function saveStoredSecret(key: string, secret: string): Promise<void> {
  await writeSetting(key, {
    ciphertext: encryptSecret(secret),
    addedAt: new Date().toISOString(),
  });
}

async function clearStoredSecret(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}

export function getStoredApiKey(): Promise<string | null> {
  return getStoredSecret(SETTINGS_KEYS.openrouterApiKey);
}

export function saveStoredApiKey(key: string): Promise<void> {
  return saveStoredSecret(SETTINGS_KEYS.openrouterApiKey, key);
}

/** Removes the admin-stored key. An `OPENROUTER_API_KEY` env var is untouched. */
export function clearStoredApiKey(): Promise<void> {
  return clearStoredSecret(SETTINGS_KEYS.openrouterApiKey);
}

/* ------------------------------------------------------------------ *
 * WhatsApp Cloud API settings
 * ------------------------------------------------------------------ */

/**
 * Non-secret WhatsApp settings. The access token is deliberately *not* here —
 * it is a credential and is stored encrypted under its own settings key.
 */
export type WhatsappConfig = {
  /** The *sending* number's numeric ID from Meta, not the phone number itself. */
  phoneNumberId: string;
  /** Echoed back by Meta during the webhook GET handshake. */
  verifyToken: string;
  apiVersion: string;
};

export const DEFAULT_WHATSAPP_CONFIG: WhatsappConfig = {
  phoneNumberId: "",
  verifyToken: "amates-verify",
  apiVersion: "v26.0",
};

export function getWhatsappConfig(): Promise<WhatsappConfig> {
  return readSetting(SETTINGS_KEYS.whatsapp, DEFAULT_WHATSAPP_CONFIG);
}

export function saveWhatsappConfig(config: WhatsappConfig): Promise<void> {
  return writeSetting(SETTINGS_KEYS.whatsapp, config);
}

export function getStoredWhatsappToken(): Promise<string | null> {
  return getStoredSecret(SETTINGS_KEYS.whatsappAccessToken);
}

export function saveStoredWhatsappToken(token: string): Promise<void> {
  return saveStoredSecret(SETTINGS_KEYS.whatsappAccessToken, token);
}

/** Removes the admin-stored token. A `WHATSAPP_ACCESS_TOKEN` env var is untouched. */
export function clearStoredWhatsappToken(): Promise<void> {
  return clearStoredSecret(SETTINGS_KEYS.whatsappAccessToken);
}
