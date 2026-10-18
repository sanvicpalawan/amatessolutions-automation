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

function config(): Config | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return null;
  return {
    token,
    phoneNumberId,
    version: process.env.WHATSAPP_API_VERSION?.trim() || DEFAULT_API_VERSION,
  };
}

/** True when both the token and the sender phone-number ID are present. */
export function whatsappConfigured(): boolean {
  return config() !== null;
}

/**
 * The Cloud API wants international format with no "+" and no punctuation.
 * `+63 917 000 0000` becomes `639170000000`.
 */
export function normaliseRecipient(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export async function sendWhatsappText(to: string, body: string): Promise<SendOutcome> {
  const cfg = config();
  if (!cfg) {
    return {
      sent: false,
      reason: "not_configured",
      detail:
        "WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are not set, so nothing was sent.",
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
