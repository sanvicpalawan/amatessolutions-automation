import { after } from "next/server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { normalizeLead, parseWhatsappMessage } from "@/lib/leads";
import {
  buildAutoReply,
  replyToQuestion,
  runIntakeAutomations,
  scoreLead,
} from "@/lib/automation";
import { looksLikeQuestion } from "@/lib/faq";
import { computeRoi } from "@/lib/roi";

export const dynamic = "force-dynamic";
/** Outbound replies and the proposal both run in `after()`, so allow for them. */
export const maxDuration = 60;

/** Meta-style verification handshake (stub). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_VERIFY_TOKEN ?? "amates-verify";

  if (mode === "subscribe" && token === expected) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return Response.json({ ok: true, service: "amates-whatsapp-webhook" });
}

type MetaWebhook = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{ from?: string; text?: { body?: string } }>;
      };
    }>;
  }>;
  from?: string;
  text?: string;
};

/**
 * POST /api/webhook/whatsapp
 * Accepts either a Meta Cloud API payload or a simple { from, text } body,
 * parses the message, writes it into the unified `leads` table, and — when
 * WhatsApp credentials are configured — actually answers the guest: an instant
 * ROI acknowledgement, plus a knowledge-base answer if they asked a question.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as MetaWebhook;

  const change = body.entry?.[0]?.changes?.[0]?.value;
  const metaMessage = change?.messages?.[0];
  const from = metaMessage?.from ?? body.from ?? "";
  const text = metaMessage?.text?.body ?? body.text ?? "";
  const profileName = change?.contacts?.[0]?.profile?.name;

  if (!from || !text) {
    return Response.json({ ok: false, error: "Missing `from` or `text`" }, { status: 400 });
  }

  const normalizedFrom = from.startsWith("+") ? from : `+${from.replace(/[^0-9]/g, "")}`;
  const parsed = parseWhatsappMessage(text, normalizedFrom);
  if (profileName) parsed.contactName = profileName;

  const result = normalizeLead(parsed, "whatsapp");
  if (!result.ok) {
    return Response.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  const [row] = await db.insert(leads).values(result.lead).returning({ id: leads.id });

  // Reply instantly with the estimate, then do the real delivery in the background.
  const lead = { ...result.lead, id: row.id } as Parameters<typeof runIntakeAutomations>[0];
  const roi = computeRoi(lead);
  const reply = buildAutoReply(lead, roi, scoreLead(lead));
  const question = looksLikeQuestion(text) ? text : null;

  // Meta wants a fast 200 and retries anything slower, so nothing is sent inline.
  // The acknowledgement fires in the first second of `runIntakeAutomations`;
  // the FAQ answer lands whenever the model answers. Running them together means
  // the guest gets the estimate first and the answer as soon as it is ready,
  // rather than waiting behind proposal generation.
  after(async () => {
    const [pipeline, faq] = await Promise.allSettled([
      runIntakeAutomations(lead),
      question ? replyToQuestion(lead, question) : Promise.resolve(null),
    ]);

    if (pipeline.status === "rejected") {
      console.error("[automation] whatsapp pipeline failed", pipeline.reason);
    }
    if (faq.status === "rejected") {
      console.error("[automation] whatsapp FAQ reply failed", faq.reason);
    }
  });

  return Response.json({
    ok: true,
    leadId: row.id,
    parsed: {
      propertyType: result.lead.propertyType,
      location: result.lead.location,
      gridState: result.lead.gridState,
    },
    instantEstimate: {
      systemSizeKw: roi.systemSizeKw,
      batteryKwh: roi.batteryKwh,
      monthlySavingsPhp: roi.monthlySavingsPhp,
      paybackYears: roi.paybackYears,
    },
    /** Echoed for callers that predate outbound delivery; the guest reply is sent, not returned. */
    reply,
    answeringQuestion: Boolean(question),
  });
}
