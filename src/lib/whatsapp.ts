/**
 * WhatsApp Cloud API sender — BACKEND ONLY.
 *
 * Sends free-form text through Meta's Graph API. Two things this module is
 * deliberately honest about:
 *
 * 1. **Unconfigured is not success.** With no token/phone-number ID it returns
 *    `not_configured` instead of pretending a message went out.
 * 2. **The 24-hour customer service window is real.** Free-form text may only be
 *    sent to someone who messaged us within the last 24 hours. Meta rejects
 *    anything else (error 131047, "re-engagement"), which we surface as
 *    `outside_service_window` rather than a generic failure. Proactive outbound
 *    needs an approved message template, which is why this module will not
 *    claim to have "queued" anything.
 *
 * Never throws — every path returns a structured outcome for the audit log.
 */
import "server-only";

import { getStoredWhatsappToken, getWhatsappConfig } from "@/lib/settings";

const DEFAULT_API_VERSION = "v26.0";
/** Cloud API caps a text body at 4096 characters. */
const MAX_BODY_CHARS = 4096;
/** Meta's code for "more than 24h since the user's last message". */
const RE_ENGAGEMENT_CODE = 131047;

export type SendFailure =
  | "not_configured"
  | "outside_service_window"
  | "rejected"
  | "network_error";

export type SendOutcome =
  | { sent: true; to: string; messageId: string }
  | { sent: false; reason: SendFailure; detail: string };

type Config = { token: string; phoneNumberId: string; version: string };

/** Where the live credential came from — surfaced in the admin screen. */
export type CredentialSource = "env" | "admin" | "none";

/**
 * Resolves the sending credentials.
 *
 * The environment wins, so production stays env-driven; anything saved in the
 * backoffice is the build-phase fallback. Same precedence rule as the OpenRouter
 * key, so there is one thing to remember rather than two.
 */
export async function resolveConfig(): Promise<Config | null> {
  const stored = await getWhatsappConfig();
  const token =
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() || (await getStoredWhatsappToken())?.trim() || "";
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || stored.phoneNumberId.trim();

  if (!token || !phoneNumberId) return null;

  return {
    token,
    phoneNumberId,
    version:
      process.env.WHATSAPP_API_VERSION?.trim() || stored.apiVersion?.trim() || DEFAULT_API_VERSION,
  };
}

/** True when a token and a sender phone-number ID are both available. */
export async function whatsappConfigured(): Promise<boolean> {
  return (await resolveConfig()) !== null;
}

async function activeToken(): Promise<string> {
  return (
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() ||
    (await getStoredWhatsappToken())?.trim() ||
    ""
  );
}

export async function tokenSource(): Promise<CredentialSource> {
  if (process.env.WHATSAPP_ACCESS_TOKEN?.trim()) return "env";
  return (await getStoredWhatsappToken())?.trim() ? "admin" : "none";
}

function mask(secret: string): string {
  if (!secret) return "not set";
  if (secret.length <= 10) return `${secret.slice(0, 2)}••••••`;
  return `${secret.slice(0, 6)}${"•".repeat(14)}${secret.slice(-4)}`;
}

/** Never returns the raw token — only a masked preview for the admin screen. */
export async function maskedToken(): Promise<string> {
  return mask(await activeToken());
}

/** The token Meta must echo back during the webhook GET handshake. */
export async function expectedVerifyToken(): Promise<string> {
  const stored = await getWhatsappConfig();
  return (
    process.env.WHATSAPP_VERIFY_TOKEN?.trim() || stored.verifyToken?.trim() || "amates-verify"
  );
}

export type WhatsappStatus = {
  configured: boolean;
  tokenSource: CredentialSource;
  maskedToken: string;
  phoneNumberId: string;
  apiVersion: string;
  verifyToken: string;
  /** When true the value comes from the environment, so the admin field is inert. */
  tokenFromEnv: boolean;
  phoneFromEnv: boolean;
  /** What is still missing, in the order the client should fix it. */
  missing: string[];
  webhookUrl: string;
};

export async function whatsappStatus(origin: string): Promise<WhatsappStatus> {
  const stored = await getWhatsappConfig();
  const tokenFromEnv = Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim());
  const phoneFromEnv = Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim());
  const token = await activeToken();
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || stored.phoneNumberId.trim();

  const missing: string[] = [];
  if (!token) missing.push("Access token");
  if (!phoneNumberId) missing.push("Phone number ID");

  return {
    configured: missing.length === 0,
    tokenSource: tokenFromEnv ? "env" : token ? "admin" : "none",
    maskedToken: mask(token),
    phoneNumberId,
    apiVersion:
      process.env.WHATSAPP_API_VERSION?.trim() || stored.apiVersion?.trim() || DEFAULT_API_VERSION,
    verifyToken: await expectedVerifyToken(),
    tokenFromEnv,
    phoneFromEnv,
    missing,
    webhookUrl: `${origin.replace(/\/$/, "")}/api/webhook/whatsapp`,
  };
}

export type VerifyOutcome =
  | { ok: true; displayPhoneNumber: string; verifiedName: string; qualityRating?: string }
  | { ok: false; detail: string };

/**
 * Asks Meta about the sending number, which confirms the token and the
 * phone-number ID are a working pair.
 *
 * Deliberately a read, not a test send: free-form text may only be sent to
 * someone who messaged us in the last 24 hours, so a test send to an arbitrary
 * number comes back as error 131047 and makes working credentials look broken.
 */
export async function verifyCredentials(): Promise<VerifyOutcome> {
  const cfg = await resolveConfig();
  if (!cfg) {
    return {
      ok: false,
      detail: "Not configured yet — set the access token and the phone number ID first.",
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${cfg.version}/${cfg.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${cfg.token}` }, cache: "no-store" },
    );

    const payload = (await response.json().catch(() => ({}))) as {
      display_phone_number?: string;
      verified_name?: string;
      quality_rating?: string;
      error?: { message?: string; code?: number };
    };

    if (!response.ok) {
      const code = payload.error?.code;
      return {
        ok: false,
        detail: `Meta rejected these credentials (HTTP ${response.status}${
          code ? `, code ${code}` : ""
        }): ${payload.error?.message ?? "unknown error"}`,
      };
    }

    return {
      ok: true,
      displayPhoneNumber: payload.display_phone_number ?? "unknown",
      verifiedName: payload.verified_name ?? "unknown",
      qualityRating: payload.quality_rating,
    };
  } catch (error) {
    return { ok: false, detail: `Could not reach Meta: ${(error as Error).message}` };
  }
}

/**
 * The Cloud API wants international format with no "+" and no punctuation.
 * `+63 917 000 0000` becomes `639170000000`.
 */
export function normaliseRecipient(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export async function sendWhatsappText(to: string, body: string): Promise<SendOutcome> {
  const cfg = await resolveConfig();
  if (!cfg) {
    return {
      sent: false,
      reason: "not_configured",
      detail:
        "No WhatsApp access token / phone number ID. Set them in the backoffice at /admin/settings, or as WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    };
  }

  const recipient = normaliseRecipient(to);
  if (recipient.length < 7) {
    return { sent: false, reason: "rejected", detail: `"${to}" is not a usable phone number.` };
  }

  const text = body.trim().slice(0, MAX_BODY_CHARS);
  if (!text) {
    return { sent: false, reason: "rejected", detail: "Refusing to send an empty message." };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${cfg.version}/${cfg.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: { preview_url: false, body: text },
        }),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { code?: number; message?: string; error_data?: { details?: string } };
    };

    if (!response.ok) {
      const code = payload.error?.code;
      const reason: SendFailure =
        code === RE_ENGAGEMENT_CODE ? "outside_service_window" : "rejected";
      const detail = payload.error?.error_data?.details ?? payload.error?.message ?? "unknown error";
      return {
        sent: false,
        reason,
        detail: `WhatsApp ${response.status}${code ? ` (code ${code})` : ""}: ${detail}`,
      };
    }

    const messageId = payload.messages?.[0]?.id;
    if (!messageId) {
      return {
        sent: false,
        reason: "rejected",
        detail: "WhatsApp accepted the request but returned no message id.",
      };
    }

    return { sent: true, to: recipient, messageId };
  } catch (error) {
    return { sent: false, reason: "network_error", detail: (error as Error).message };
  }
}
