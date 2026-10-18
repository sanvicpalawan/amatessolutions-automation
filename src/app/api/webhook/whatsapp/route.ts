import { after } from "next/server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { normalizeLead, parseWhatsappMessage } from "@/lib/leads";
import { buildAutoReply, runIntakeAutomations, scoreLead } from "@/lib/automation";
import { computeRoi } from "@/lib/roi";

export const dynamic = "force-dynamic";

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
 * parses the message, writes it into the unified `leads` table, and replies
 * instantly with an ROI estimate + auto-booked audit confirmation.
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

  // Reply instantly with the estimate, then finish the pipeline in background.
  const lead = { ...result.lead, id: row.id } as Parameters<typeof runIntakeAutomations>[0];
  const roi = computeRoi(lead);
  const reply = buildAutoReply(lead, roi, scoreLead(lead));

  after(async () => {
    try {
      await runIntakeAutomations(lead);
    } catch (error) {
      console.error("[automation] whatsapp pipeline failed", error);
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
    reply,
  });
}
