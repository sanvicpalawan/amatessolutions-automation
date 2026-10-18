/**
 * Email delivery — BACKEND ONLY.
 *
 * Partner to `whatsapp.ts`, and built the same way: never throws, and an
 * unconfigured or rejected send is reported honestly instead of logged as a
 * success.
 *
 * Why it exists: WhatsApp will not let us send a free-form reply to a web-form
 * lead, because Meta only permits those inside the 24-hour customer service
 * window. Without email, a web enquiry gets no acknowledgement at all.
 *
 * Provider is Resend, called over plain `fetch` so there is no SDK to keep
 * patched. Set `EMAIL_API_URL` to point at any Resend-compatible endpoint.
 */
import "server-only";

const DEFAULT_API_URL = "https://api.resend.com/emails";

export type EmailFailure = "not_configured" | "no_address" | "rejected" | "network_error";

export type EmailOutcome =
  | { sent: true; to: string; id: string }
  | { sent: false; reason: EmailFailure; detail: string };

type Config = { key: string; from: string; url: string };

function config(): Config | null {
  const key = process.env.EMAIL_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) return null;
  return { key, from, url: process.env.EMAIL_API_URL?.trim() || DEFAULT_API_URL };
}

/** True when both the API key and a verified sender address are present. */
export function emailConfigured(): boolean {
  return config() !== null;
}

/** Minimal escaping — the body is written by us, but this keeps it safe anyway. */
function toHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap">${escaped}</div>`;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<EmailOutcome> {
  const cfg = config();
  if (!cfg) {
    return {
      sent: false,
      reason: "not_configured",
      detail: "EMAIL_API_KEY / EMAIL_FROM are not set, so nothing was sent.",
    };
  }

  const address = to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
    return { sent: false, reason: "no_address", detail: `"${to}" is not a usable email address.` };
  }

  const text = body.trim();
  if (!text) {
    return { sent: false, reason: "rejected", detail: "Refusing to send an empty email." };
  }

  try {
    const response = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        from: cfg.from,
        to: [address],
        subject: subject.trim().slice(0, 200) || "Amates Solutions",
        text,
        html: toHtml(text),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: string;
      name?: string;
    };

    if (!response.ok) {
      const detail = payload.message ?? payload.error ?? payload.name ?? "unknown error";
      return { sent: false, reason: "rejected", detail: `Email ${response.status}: ${detail}` };
    }

    if (!payload.id) {
      return {
        sent: false,
        reason: "rejected",
        detail: "The provider accepted the request but returned no message id.",
      };
    }

    return { sent: true, to: address, id: payload.id };
  } catch (error) {
    return { sent: false, reason: "network_error", detail: (error as Error).message };
  }
}
