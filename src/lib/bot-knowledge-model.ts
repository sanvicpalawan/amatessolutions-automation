/**
 * What the bot knows, in the two halves it has to be split into.
 *
 * This half is *pure* — types, the topic list and the original wording. It is
 * safe to import from the browser and from the marketing pages. The stored
 * overrides live in Postgres and are read only on the server, in
 * `src/lib/bot-knowledge.ts`. Keeping them apart means `knowledge.ts`, which
 * the public site imports, never drags a database client into the bundle.
 *
 * The defaults below are the wording the bot shipped with. An empty store
 * therefore changes nothing: the bot reads exactly as it did before any of this
 * was editable, and only diverges once someone edits a box.
 *
 * What is *not* here on purpose: which question maps to which topic. That is
 * routing, it is technical, and it stays in code (`src/lib/faq.ts`). The owner
 * edits the words, not the regexes.
 */
import { ENERGY_ASSUMPTIONS, php } from "@/lib/roi";

export type BotTopicKey =
  | "pricing"
  | "monitoring"
  | "timeline"
  | "maintenance"
  | "hardware"
  | "offgrid"
  | "generic";

export type BotTopic = {
  key: BotTopicKey;
  label: string;
  /** What a guest usually asks, shown under the box in the backoffice. */
  hint: string;
};

/**
 * Order matters only for display. The matching order lives in `faq.ts`.
 *
 * There is no "coverage" topic: the intro answers coverage questions too, so
 * there is one place to say where Amates works rather than two that can drift.
 * There is no "warranty" topic either, for the same reason — the warranty
 * answer is built from the terms list below.
 */
export const BOT_TOPICS: BotTopic[] = [
  {
    key: "pricing",
    label: "Pricing and budget",
    hint: '"How much?", "magkano?", "do you do financing?"',
  },
  {
    key: "monitoring",
    label: "Remote monitoring",
    hint: "Monitoring, WIFI, who watches the system",
  },
  {
    key: "timeline",
    label: "Timeline and the 4 steps",
    hint: '"How long?", "when can you start?"',
  },
  {
    key: "maintenance",
    label: "Maintenance and existing systems",
    hint: "Servicing a system Amates did not install",
  },
  {
    key: "hardware",
    label: "Hardware and durability",
    hint: "Salt, heat, typhoons, marine-grade specification",
  },
  {
    key: "offgrid",
    label: "Off-grid, diesel and outages",
    hint: "No grid, brownouts, generator sites",
  },
  {
    key: "generic",
    label: "When the bot does not know",
    hint: "The fallback. The bot must never invent an answer.",
  },
];

export type BotKnowledge = {
  /** Who Amates is and where it works. Also the answer to coverage questions. */
  intro: string;
  /**
   * Warranty, monitoring and terms. The bot's warranty answer is these lines
   * joined, so changing a condition here changes what the bot says — there is
   * no second copy to forget.
   */
  warrantyTerms: string[];
  /** The canned answer per topic, used when the AI cannot be reached. */
  answers: Record<BotTopicKey, string>;
  /** Anything else the bot must respect. Appended to the reference material. */
  extraFacts: string;
};

export const MAX_CLAUSES = 20;
export const MAX_INTRO_CHARS = 600;
export const MAX_ANSWER_CHARS = 1200;
export const MAX_CLAUSE_CHARS = 400;
export const MAX_EXTRA_FACTS_CHARS = 4000;

/** The wording the bot shipped with. */
export const DEFAULT_BOT_KNOWLEDGE: BotKnowledge = {
  intro:
    "Amates Solutions designs and installs high-resilience solar hybrid systems across Palawan, Philippines — Puerto Princesa, El Nido, San Vicente, Coron, Linapacan, Taytay and remote islands.",
  warrantyTerms: [
    "25-year performance warranty on Amates-supplied panels, subject to manufacturer terms.",
    "Free lifetime remote monitoring is available only on systems that Amates Solutions installs.",
    "Monitoring requires a functional WIFI connection at the site, provided and maintained by the client.",
    "No modifications to the system may be made by anyone except Amates Solutions technicians; third-party modification voids monitoring and warranty.",
    "Lifetime monitoring is subject to the lifespan of the appliances and of the software provided by the appliance manufacturer.",
    "Inverter warranty is typically 5–10 years; battery warranty follows the cell manufacturer's cycle rating.",
  ],
  answers: {
    pricing: `Pricing is sized from your real load rather than sold as a package. As a guide, installed cost runs about ${php(
      ENERGY_ASSUMPTIONS.installedCostPhpPerKw,
    )} per kW of solar plus ${php(
      ENERGY_ASSUMPTIONS.batteryCostPhpPerKwh,
    )} per kWh of battery storage, so a small home system lands in the hundreds of thousands of pesos and a resort system runs into the millions. Send your monthly kWh or your monthly bill and the free site audit will turn that into a firm figure.`,
    monitoring:
      "Free lifetime remote monitoring comes with every system we install, and our desk watches your production 24/7 so we often spot a fault before you do. It does need a working WIFI connection at the site, provided by the client — without WIFI, monitoring pauses until the link is back.",
    timeline:
      "Four steps: energy audit, marine-grade technical design, installation by our own crews, then activation and handover with monitoring switched on. The audit is free and normally booked within days. Installation timing depends on system size and island logistics, and we handle the barge transport ourselves.",
    maintenance:
      "Maintenance covers panel cleaning, electrical inspection, performance diagnostics, remote monitoring support, upgrades and troubleshooting. You can take it on its own even if we did not install your system, and it includes continued monitoring support.",
    hardware:
      "Everything is specified marine-grade: anodised or 316 stainless mounting, IP65+ hybrid inverters, sealed cable glands and corrosion-resistant conduit. That is chosen for coastal salt spray, 35°C+ heat and typhoon wind loading, which is where consumer-grade kits fail.",
    offgrid:
      "No grid, an unreliable grid, or a site running on diesel is our core case. We design a hybrid system with battery autonomy sized to your real daily consumption, so you are covered through outages and you burn far less fuel.",
    generic:
      "I would rather not guess on your project, so let me have a specialist confirm that one. The fastest route to a firm answer is the free site audit — send me your location, and your monthly kWh or monthly bill, and we will take it from there.",
  },
  extraFacts: "",
};

/**
 * The warranty answer, built from the terms so the two can never disagree.
 *
 * It is longer than a typical WhatsApp reply, which is the honest trade for
 * having one editable source. Shorten the lines to shorten the answer.
 */
export function warrantyAnswer(knowledge: BotKnowledge): string {
  return knowledge.warrantyTerms.join(" ");
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Coerce anything (a stale store row, a hand-rolled request body) into a
 * complete BotKnowledge. Missing or unusable pieces fall back to the shipped
 * wording rather than leaving the bot with an empty answer.
 */
export function normaliseBotKnowledge(input: unknown): BotKnowledge {
  const source = (input ?? {}) as Partial<Record<keyof BotKnowledge, unknown>>;

  const intro = clean(source.intro, MAX_INTRO_CHARS) || DEFAULT_BOT_KNOWLEDGE.intro;

  const rawTerms = Array.isArray(source.warrantyTerms) ? source.warrantyTerms : [];
  const warrantyTerms = rawTerms
    .map((term) => clean(term, MAX_CLAUSE_CHARS))
    .filter(Boolean)
    .slice(0, MAX_CLAUSES);

  const rawAnswers = (source.answers ?? {}) as Record<string, unknown>;
  const answers = {} as Record<BotTopicKey, string>;
  for (const topic of BOT_TOPICS) {
    // An empty box would leave the deterministic fallback with nothing to say,
    // which is worse than the shipped wording. Blank means "use the default".
    answers[topic.key] =
      clean(rawAnswers[topic.key], MAX_ANSWER_CHARS) || DEFAULT_BOT_KNOWLEDGE.answers[topic.key];
  }

  return {
    intro,
    // Clearing every line would make the warranty answer empty, so fall back.
    warrantyTerms: warrantyTerms.length ? warrantyTerms : [...DEFAULT_BOT_KNOWLEDGE.warrantyTerms],
    answers,
    extraFacts: clean(source.extraFacts, MAX_EXTRA_FACTS_CHARS),
  };
}

/** True when nothing has been changed from the shipped wording. */
export function isDefaultBotKnowledge(knowledge: BotKnowledge): boolean {
  return (
    knowledge.intro === DEFAULT_BOT_KNOWLEDGE.intro &&
    knowledge.extraFacts === DEFAULT_BOT_KNOWLEDGE.extraFacts &&
    knowledge.warrantyTerms.length === DEFAULT_BOT_KNOWLEDGE.warrantyTerms.length &&
    knowledge.warrantyTerms.every(
      (term, index) => term === DEFAULT_BOT_KNOWLEDGE.warrantyTerms[index],
    ) &&
    BOT_TOPICS.every(
      (topic) => knowledge.answers[topic.key] === DEFAULT_BOT_KNOWLEDGE.answers[topic.key],
    )
  );
}
