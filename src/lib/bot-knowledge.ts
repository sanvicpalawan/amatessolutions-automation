/**
 * The stored half of the bot's knowledge — SERVER ONLY.
 *
 * One settings row holds the owner's wording. Reading it is deliberately
 * forgiving: a missing row, a half-written row or a row from an older shape all
 * resolve to a complete BotKnowledge, so the bot never answers from an empty
 * knowledge base just because the store is unhappy.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { settings } from "@/db/schema";
import {
  DEFAULT_BOT_KNOWLEDGE,
  normaliseBotKnowledge,
  type BotKnowledge,
} from "@/lib/bot-knowledge-model";
import { SETTINGS_KEYS } from "@/lib/settings";

/** What the bot currently knows, defaults included. */
export async function getBotKnowledge(): Promise<BotKnowledge> {
  try {
    const rows = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, SETTINGS_KEYS.botKnowledge))
      .limit(1);
    return normaliseBotKnowledge(rows[0]?.value);
  } catch {
    // A database hiccup must not stop the bot answering. The shipped wording is
    // accurate, just not personalised.
    return normaliseBotKnowledge(DEFAULT_BOT_KNOWLEDGE);
  }
}

/** Save the owner's wording, normalised, and return what was actually stored. */
export async function saveBotKnowledge(input: unknown): Promise<BotKnowledge> {
  const knowledge = normaliseBotKnowledge(input);

  await db
    .insert(settings)
    .values({ key: SETTINGS_KEYS.botKnowledge, value: knowledge, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: knowledge, updatedAt: new Date() },
    });

  return knowledge;
}

/** Put the shipped wording back. */
export async function resetBotKnowledge(): Promise<BotKnowledge> {
  return saveBotKnowledge(DEFAULT_BOT_KNOWLEDGE);
}
