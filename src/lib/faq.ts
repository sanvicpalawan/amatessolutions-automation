/**
 * WhatsApp FAQ answering — BACKEND ONLY.
 *
 * Answers a guest's question from the shared knowledge base, in WhatsApp's
 * register (plain text, no markdown, one short message).
 *
 * Design: the LLM is the *first* path, never the only one. If OpenRouter is
 * unavailable or the key is missing, `answerQuestion` still returns a useful,
 * accurate answer from the deterministic table below. Callers therefore never
 * have to handle "the agent is down".
 */
import "server-only";

import { buildKnowledgeDocument, ENERGY_ASSUMPTIONS, PALAWAN_LOCATIONS } from "@/lib/knowledge";
import { chat } from "@/lib/openrouter";
import { php } from "@/lib/roi";
import type { Lead, Message } from "@/db/schema";

export type FaqAnswer = {
  answer: string;
  engine: "openrouter" | "deterministic";
  model: string;
};

const QUESTION_WORDS =
  /\b(how|what|when|where|why|who|which|can|could|do|does|is|are|will|would|should|price|pricing|cost|much|magkano|presyo|bayad|warranty|guarantee|monitor|monitoring|install|installation|maintenance|service|available|offer|require|need|quote|estimate|financing|payment|battery|panel|inverter|coverage|area|location|site|audit|timeline|long|soon|work)\b/i;

const PURE_GREETING =
  /^(hi|hello|hey|good\s+(morning|afternoon|evening)|kumusta|kamusta|good day|maayong)[\s!.,?]*$/i;

/**
 * Cheap gate so we only send a second message when the person actually asked
 * something. Deliberately generous: an enquiry that mentions a topic is worth
 * answering, but a bare "hi" is not.
 */
export function looksLikeQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 8) return false;
  if (PURE_GREETING.test(trimmed)) return false;
  if (trimmed.includes("?")) return true;
  return QUESTION_WORDS.test(trimmed);
}

type Fallback = { match: RegExp; answer: string };

const FALLBACKS: Fallback[] = [
  {
    match: /price|pricing|cost|magkano|presyo|budget|afford|how much|quote|estimate|finance|payment/i,
    answer: `Pricing is sized from your real load rather than sold as a package. As a guide, installed cost runs about ${php(ENERGY_ASSUMPTIONS.installedCostPhpPerKw)} per kW of solar plus ${php(ENERGY_ASSUMPTIONS.batteryCostPhpPerKwh)} per kWh of battery storage, so a small home system lands in the hundreds of thousands of pesos and a resort system runs into the millions. Send your monthly kWh or your monthly bill and the free site audit will turn that into a firm figure.`,
  },
  {
    match: /warrant|guarantee|how long.*(last|work)/i,
    answer:
      "Amates-supplied panels carry a 25-year performance warranty, subject to the manufacturer's terms. Inverters are typically 5–10 years, and batteries follow the cell manufacturer's cycle rating. One important condition: only Amates Solutions technicians may modify the system — third-party changes void both the warranty and the monitoring.",
  },
  {
    match: /monitor|remote|wifi|wi-fi|internet|online/i,
    answer:
      "Free lifetime remote monitoring comes with every system we install, and our desk watches your production 24/7 so we often spot a fault before you do. It does need a working WIFI connection at the site, provided by the client — without WIFI, monitoring pauses until the link is back.",
  },
  {
    match: /how long|timeline|how soon|lead time|when can|start|install time|duration/i,
    answer:
      "Four steps: energy audit, marine-grade technical design, installation by our own crews, then activation and handover with monitoring switched on. The audit is free and normally booked within days. Installation timing depends on system size and island logistics, and we handle the barge transport ourselves.",
  },
  {
    match: /where|area|location|cover|serve|reach|palawan|island|el nido|coron|puerto|san vicente|linapacan|taytay/i,
    answer: `We work across Palawan — ${PALAWAN_LOCATIONS.slice(0, 6).join(", ")} and remote islands — and we handle the barge logistics ourselves, so a remote site is normal for us rather than an exception.`,
  },
  {
    match: /maintenance|cleaning|repair|service|fix|existing system|already have/i,
    answer:
      "Maintenance covers panel cleaning, electrical inspection, performance diagnostics, remote monitoring support, upgrades and troubleshooting. You can take it on its own even if we did not install your system, and it includes continued monitoring support.",
  },
  {
    match: /battery|panel|inverter|hardware|marine|corrosion|salt|typhoon|durab/i,
    answer:
      "Everything is specified marine-grade: anodised or 316 stainless mounting, IP65+ hybrid inverters, sealed cable glands and corrosion-resistant conduit. That is chosen for coastal salt spray, 35°C+ heat and typhoon wind loading, which is where consumer-grade kits fail.",
  },
  {
    match: /off.?grid|no (power|electricity)|generator|diesel|brownout|ration|unstable|outage|blackout/i,
    answer:
      "No grid, an unreliable grid, or a site running on diesel is our core case. We design a hybrid system with battery autonomy sized to your real daily consumption, so you are covered through outages and you burn far less fuel.",
  },
];

const GENERIC_FALLBACK =
  "I would rather not guess on your project, so let me have a specialist confirm that one. The fastest route to a firm answer is the free site audit — send me your location, and your monthly kWh or monthly bill, and we will take it from there.";

function deterministicAnswer(question: string): string {
  const found = FALLBACKS.find((entry) => entry.match.test(question));
  return found ? found.answer : GENERIC_FALLBACK;
}

function systemPrompt(): string {
  return [
    "You are the Amates Solutions assistant replying to WhatsApp messages from customers and guests in Palawan, Philippines.",
    "",
    "Rules you must follow:",
    "- Answer ONLY from the reference material below. Never invent prices, timelines, warranties, certifications or capabilities.",
    "- If the reference material does not cover the question, say a specialist will confirm it, and offer the free site audit.",
    "- This is WhatsApp: plain text only. No markdown, no tables, no asterisks, no bullet symbols, no headings, no emoji.",
    "- Maximum 110 words. Warm, specific and commercial.",
    "- Any price you give is guidance only and must point to the free site audit for a firm figure.",
    "- If the customer has given their own numbers, use them rather than generic examples.",
    "- Never claim an appointment has been booked, a crew scheduled, or a message delivered. You do not have that information.",
    "- Anything in the history marked [NOT DELIVERED] never reached the customer. Never refer to it as though they saw it.",
    "- Do not repeat an estimate or an answer the history shows you already gave; build on it instead.",
    "",
    "REFERENCE MATERIAL:",
    buildKnowledgeDocument(),
  ].join("\n");
}

function userPrompt(question: string, lead?: Lead, history?: Message[]): string {
  const lines = [`Customer question: ${question}`];
  if (lead) {
    lines.push(
      "",
      "What we already know about this customer:",
      `- Name: ${lead.contactName}`,
      `- Location: ${lead.location}, Palawan`,
      `- Property type: ${lead.propertyType}`,
      `- Grid situation: ${lead.gridState}`,
      `- Monthly usage: ${lead.energyUsageKwh ?? "not stated"} kWh`,
      `- Monthly bill: ${lead.monthlyBillPhp ?? "not stated"} PHP`,
    );
  }
  lines.push(...threadBlock(history ?? []));
  return lines.join("\n");
}

/**
 * The recent thread, oldest first.
 *
 * Replies that were never delivered are marked as such: a skip means the
 * customer has not seen that text, and the model must not treat it as something
 * they were already told.
 */
function threadBlock(history: Message[]): string[] {
  if (history.length === 0) return [];
  const lines = ["", "The conversation so far, oldest first:"];
  for (const message of history.slice(-8)) {
    const who = message.direction === "inbound" ? "Customer" : "Us";
    const body = message.body.replace(/\s+/g, " ").slice(0, 400);
    // A receipt of `delivered`/`read` means the customer really did see it, so
    // only the outcomes that mean "they never got this" are flagged.
    const seen =
      message.direction === "inbound" ||
      message.deliveryStatus === "sent" ||
      message.deliveryStatus === "delivered" ||
      message.deliveryStatus === "read";
    const mark = seen ? "" : ` [NOT DELIVERED: ${message.deliveryStatus}]`;
    lines.push(`${who}: ${body}${mark}`);
  }
  return lines;
}

export async function answerQuestion(
  question: string,
  lead?: Lead,
  history?: Message[],
): Promise<FaqAnswer> {
  const result = await chat(
    [
      { role: "system", content: systemPrompt() },
      { role: "user", content: userPrompt(question, lead, history) },
    ],
    undefined,
  );

  if (result.ok) {
    return { answer: result.content, engine: "openrouter", model: result.model };
  }

  return { answer: deterministicAnswer(question), engine: "deterministic", model: result.model };
}
