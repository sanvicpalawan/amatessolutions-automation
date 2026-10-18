import { after } from "next/server";

import { db } from "@/db";
import { leads, type Lead } from "@/db/schema";
import { normalizeLead, parseWhatsappMessage } from "@/lib/leads";
import {
  alreadySeen,
  absorbNewFacts,
  findOpenLeadByPhone,
  logMessage,
} from "@/lib/conversation";
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
        /** `id` is the WAMID, our only defence against Meta's webhook retries. */
        messages?: Array<{ id?: string; from?: string; text?: { body?: string } }>;
      };
    }>;
  }>;
  from?: string;
  text?: string;
  /** Set by our own callers so a replayed request is not processed twice. */
  id?: string;
};

/**
 * POST /api/webhook/whatsapp
 *
 * Accepts either a Meta Cloud API payload or a simple { from, text } body, then
 * continues the conversation that number belongs to and answers it.
 *
 * Two behaviours matter here:
 *  - A message from a known number continues the existing lead rather than
 *    creating another one, and the reply is grounded in the history.
 *  - The full intake pipeline (instant estimate, proposal, audit booking) runs
 *    only for a brand-new lead. Re-running it on every message would re-send the
 *    estimate and, worse, book a duplicate audit appointment each time.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as MetaWebhook;

  const change = body.entry?.[0]?.changes?.[0]?.value;
  const metaMessage = change?.messages?.[0];
  const from = metaMessage?.from ?? body.from ?? "";
  const text = metaMessage?.text?.body ?? body.text ?? "";
  const profileName = change?.contacts?.[0]?.profile?.name;
  const externalId = metaMessage?.id ?? body.id ?? null;

  if (!from || !text) {
    return Response.json({ ok: false, error: "Missing `from` or `text`" }, { status: 400 });
  }

  // Meta re-delivers anything it thinks failed. Before this, each retry became
  // another lead and another reply to the same person.
  if (await alreadySeen(externalId)) {
    return Response.json({ ok: true, duplicate: true, externalId });
  }

  const normalizedFrom = from.startsWith("+") ? from : `+${from.replace(/[^0-9]/g, "")}`;
  const parsed = parseWhatsappMessage(text, normalizedFrom);
  if (profileName) parsed.contactName = profileName;

  const result = normalizeLead(parsed, "whatsapp");
  if (!result.ok) {
    return Response.json({ ok: false, errors: result.errors }, { status: 422 });
  }

  const existing = await findOpenLeadByPhone(normalizedFrom);
  const isNewLead = existing === null;

  let lead: Lead;
  if (existing) {
    // A returning guest often only reveals the property and the load on the
    // second message, so fill the gaps without overwriting what we know.
    lead = await absorbNewFacts(existing, result.lead as Partial<Lead>);
  } else {
    const [row] = await db.insert(leads).values(result.lead).returning();
    lead = row;
  }

  await logMessage({
    leadId: lead.id,
    direction: "inbound",
    channel: "whatsapp",
    body: text,
    deliveryStatus: "received",
    externalId,
    meta: { profileName: profileName ?? null, isNewLead },
  });

  const roi = computeRoi(lead);
  const reply = buildAutoReply(lead, roi, scoreLead(lead));
  const question = looksLikeQuestion(text) ? text : null;

  // Meta wants a fast 200 and retries anything slower, so nothing is sent inline.
  // On a first message the acknowledgement fires in the first second of
  // `runIntakeAutomations`; the FAQ answer lands whenever the model answers.
  // Running them together means the guest gets the estimate first and the answer
  // as soon as it is ready, rather than waiting behind proposal generation.
  after(async () => {
    const [pipeline, faq] = await Promise.allSettled([
      isNewLead ? runIntakeAutomations(lead) : Promise.resolve(null),
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
    leadId: lead.id,
    isNewLead,
    parsed: {
      propertyType: lead.propertyType,
      location: lead.location,
      gridState: lead.gridState,
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
