import { getSessionUser } from "@/lib/auth";
import {
  clearStoredWhatsappToken,
  DEFAULT_WHATSAPP_CONFIG,
  getWhatsappConfig,
  saveStoredWhatsappToken,
  saveWhatsappConfig,
  type WhatsappConfig,
} from "@/lib/settings";
import { sendWhatsappText, verifyCredentials, whatsappStatus } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** The request's own origin, so the webhook URL shown matches where you are. */
function originOf(request: Request): string {
  return new URL(request.url).origin;
}

/**
 * GET /api/settings/whatsapp
 * Status only. The access token is never returned — not masked-and-truncated,
 * not anything: the admin screen only ever receives the masked preview.
 */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [status, config] = await Promise.all([
    whatsappStatus(originOf(request)),
    getWhatsappConfig(),
  ]);

  return Response.json({ status, config });
}

/**
 * PUT /api/settings/whatsapp
 *
 * Partial by design: only fields present in the body change, so saving the phone
 * number ID cannot silently wipe the access token. An empty `accessToken`
 * explicitly clears the stored one.
 */
export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Partial<{
    phoneNumberId: string;
    verifyToken: string;
    apiVersion: string;
    accessToken: string;
  }>;

  let tokenMessage: string | undefined;

  if (typeof body.accessToken === "string") {
    const candidate = body.accessToken.trim();
    if (candidate === "") {
      await clearStoredWhatsappToken();
      tokenMessage = "Stored access token cleared.";
    } else if (candidate.length < 20) {
      return Response.json(
        {
          error:
            "That is too short to be a Meta access token. Copy the whole token from Meta → WhatsApp → API Setup.",
        },
        { status: 422 },
      );
    } else {
      await saveStoredWhatsappToken(candidate);
      tokenMessage = "Access token saved — encrypted in Postgres, never sent back to the browser.";
    }
  }

  const current = await getWhatsappConfig();
  const next: WhatsappConfig = { ...current };

  if (typeof body.phoneNumberId === "string") {
    const candidate = body.phoneNumberId.trim();
    if (candidate === "") {
      next.phoneNumberId = "";
    } else if (!/^[0-9]{5,30}$/.test(candidate)) {
      // The common mistake is pasting the phone number instead of its ID.
      return Response.json(
        {
          error:
            "The phone number ID is digits only (for example 123456789012345). That looks like the phone number itself — Meta shows both on the API Setup page.",
        },
        { status: 422 },
      );
    } else {
      next.phoneNumberId = candidate;
    }
  }

  if (typeof body.verifyToken === "string") {
    next.verifyToken = body.verifyToken.trim().slice(0, 120) || DEFAULT_WHATSAPP_CONFIG.verifyToken;
  }

  if (typeof body.apiVersion === "string") {
    const candidate = body.apiVersion.trim();
    if (candidate === "") {
      next.apiVersion = DEFAULT_WHATSAPP_CONFIG.apiVersion;
    } else if (!/^v\d+\.\d+$/.test(candidate)) {
      return Response.json(
        { error: "The API version looks like v26.0 — a v, digits, a dot, digits." },
        { status: 422 },
      );
    } else {
      next.apiVersion = candidate;
    }
  }

  await saveWhatsappConfig(next);

  const status = await whatsappStatus(originOf(request));
  return Response.json({ ok: true, status, config: next, tokenMessage });
}

/**
 * POST /api/settings/whatsapp
 *
 * `{ "action": "verify" }` asks Meta about the sending number — this is the
 * button the client should press after pasting credentials.
 *
 * `{ "action": "test", "to": "+63917..." }` actually sends a message, so it is
 * labelled honestly: outside WhatsApp's 24-hour customer service window Meta
 * will refuse it, and that refusal is reported rather than hidden.
 */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { action?: string; to?: string };

  if (body.action === "verify") {
    const result = await verifyCredentials();
    return Response.json(result, { status: result.ok ? 200 : 422 });
  }

  if (body.action === "test") {
    const to = (body.to ?? "").trim();
    if (!to) {
      return Response.json({ error: "Give a number to send the test to." }, { status: 422 });
    }

    const result = await sendWhatsappText(
      to,
      "Amates Solutions: this is a test message from your website backoffice. If you can read this, WhatsApp sending is working.",
    );

    return Response.json(result, { status: result.sent ? 200 : 422 });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}
