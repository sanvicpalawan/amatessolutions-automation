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

import { getBotKnowledge } from "@/lib/bot-knowledge";
import {
  warrantyAnswer,
  type BotKnowledge,
  type BotTopicKey,
} from "@/lib/bot-knowledge-model";
import { buildKnowledgeDocument } from "@/lib/knowledge";
import { chat } from "@/lib/openrouter";
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

/**
 * What a matcher can resolve to. Two of these are not stored answers:
 * `warranty` is built from the terms list and `coverage` is the intro line, so
 * there is no second copy of either to drift out of date.
 */
type MatcherKey = Exclude<BotTopicKey, "generic"> | "warranty" | "coverage";

/**
 * Which question routes to which topic. This is routing, not knowledge, so it
 * stays in code: the owner edits the words a topic produces, never the regexes.
 * Order matters — the first match wins.
 *
 * Coverage has no answer of its own; the intro line answers it, so "where do
 * you work?" has one editable source rather than two that can drift apart.
 */
const TOPIC_MATCHERS: Array<{ key: MatcherKey; match: RegExp }> = [
  {
    key: "pricing",
    match: /price|pricing|cost|magkano|presyo|budget|afford|how much|quote|estimate|finance|payment/i,
  },
  { key: "warranty", match: /warrant|guarantee|how long.*(last|work)/i },
  { key: "monitoring", match: /monitor|remote|wifi|wi-fi|internet|online/i },
  {
    key: "timeline",
    match: /how long|timeline|how soon|lead time|when can|start|install time|duration/i,
  },
  {
    key: "coverage",
    match:
      /where|area|location|cover|serve|reach|palawan|island|el nido|coron|puerto|san vicente|linapacan|taytay/i,
  },
  {
    key: "maintenance",
    match: /maintenance|cleaning|repair|service|fix|existing system|already have/i,
  },
  {
    key: "hardware",
    match: /battery|panel|inverter|hardware|marine|corrosion|salt|typhoon|durab/i,
  },
  {
    key: "offgrid",
    match:
      /off.?grid|no (power|electricity)|generator|diesel|brownout|ration|unstable|outage|blackout/i,
  },
];

/**
 * The answer used when the AI cannot be reached. Every word of it comes from the
 * owner's stored knowledge, so what the bot says offline matches what it says
 * online and matches what the owner last typed.
 */
function deterministicAnswer(question: string, knowledge: BotKnowledge): string {
  const found = TOPIC_MATCHERS.find((entry) => entry.match.test(question));
  if (!found) return knowledge.answers.generic;
  if (found.key === "warranty") return warrantyAnswer(knowledge);
  if (found.key === "coverage") return knowledge.intro;
  return knowledge.answers[found.key];
}

function systemPrompt(knowledge: BotKnowledge): string {
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
    buildKnowledgeDocument(knowledge),
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
  // Loaded once and used by both paths, so an offline answer and an online
  // answer can never disagree about what the business says.
  const knowledge = await getBotKnowledge();

  const result = await chat(
    [
      { role: "system", content: systemPrompt(knowledge) },
      { role: "user", content: userPrompt(question, lead, history) },
    ],
    undefined,
  );

  if (result.ok) {
    return { answer: result.content, engine: "openrouter", model: result.model };
  }

  return {
    answer: deterministicAnswer(question, knowledge),
    engine: "deterministic",
    model: result.model,
  };
}
