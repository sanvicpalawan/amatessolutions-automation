/**
 * Shared Amates Solutions knowledge base.
 *
 * Used by the marketing page (client-safe copy) and by the backend AI agent,
 * which grounds every proposal in the 4-step framework, the four verticals and
 * the 25-year warranty / lifetime monitoring terms.
 *
 * This module stays free of `db` and `server-only` on purpose: the public site
 * imports it. The editable half of the bot's knowledge arrives as an argument —
 * see `src/lib/bot-knowledge.ts` for the stored copy.
 */
import {
  BOT_TOPICS,
  DEFAULT_BOT_KNOWLEDGE,
  type BotKnowledge,
} from "@/lib/bot-knowledge-model";

export type Step = {
  id: number;
  key: string;
  title: string;
  short: string;
  body: string;
};

export const STEPS: Step[] = [
  {
    id: 1,
    key: "audit",
    title: "Energy Audit",
    short: "We size the system around your real load profile.",
    body: "We analyse your power usage, peak demand windows, generator spend and grid reliability so the system is sized perfectly. No guesswork, just data.",
  },
  {
    id: 2,
    key: "design",
    title: "Marine-Grade Technical Design",
    short: "Hardware engineered for salt, heat and vibration.",
    body: "We engineer your system with marine-grade hardware: anodised or 316 stainless mounting, IP65+ hybrid inverters, sealed cable glands and corrosion-resistant conduit built to survive coastal salt spray, 35°C+ heat and typhoon wind loading.",
  },
  {
    id: 3,
    key: "install",
    title: "Efficient Installation",
    short: "Crews that hit deadlines on island logistics.",
    body: "Our experienced crews work long hours to meet deadlines and ensure your infrastructure meets industrial safety standards, including remote-island barge logistics across the Palawan archipelago.",
  },
  {
    id: 4,
    key: "activation",
    title: "Activation & Monitoring",
    short: "Free lifetime remote monitoring on every install.",
    body: "We test the system, turn it on, walk you through the basics, hand over a troubleshooting manual and activate your free lifetime remote monitoring.",
  },
];

export const VERTICALS = [
  {
    key: "residential",
    title: "Residential Solar Installation",
    blurb:
      "We design solar systems tailored to your home's energy use and preferences. Our goal is to maximize efficiency while maintaining a seamless look.",
    bullets: [
      "Energy usage assessment",
      "Custom system design",
      "Roof compatibility evaluation",
      "Inverter and battery integration",
      "Full installation & activation",
      "Monitoring system setup",
    ],
  },
  {
    key: "commercial",
    title: "Commercial Solar Installation",
    blurb:
      "We help businesses reduce operational costs and increase sustainability by implementing scalable solar systems engineered for performance and ROI.",
    bullets: [
      "Energy usage assessment",
      "Custom system design",
      "Roof compatibility evaluation",
      "Inverter and battery integration",
      "Full installation & activation",
      "Monitoring system setup",
    ],
  },
  {
    key: "industrial_marine",
    title: "Industrial & Marine Solar Projects",
    blurb:
      "High-capacity solar installations designed for factories, warehouses, logistics centres, ports and large facilities with significant energy demand.",
    bullets: [
      "Large rooftop & ground-mounted systems",
      "Advanced output modeling",
      "Grid integration & compliance",
      "Load balancing optimization",
      "Marine-grade corrosion protection",
      "Full installation & activation",
    ],
  },
  {
    key: "maintenance",
    title: "Maintenance & Monitoring",
    blurb:
      "A solar system is a smart, long-term investment. We provide ongoing maintenance services to ensure optimal efficiency and reliability for everyone.",
    bullets: [
      "Panel cleaning",
      "Electrical inspection",
      "Performance diagnostics",
      "Remote monitoring support",
      "System upgrades & troubleshooting",
      "Full installation & activation",
      "Monitoring system setup",
    ],
  },
] as const;

/** The five-stage delivery flow shown on the Services page. */
export const SERVICE_STEPS = [
  {
    key: "consultation",
    title: "Consultation",
    body: "We assess your energy usage, site conditions and budget, then recommend the right system size.",
  },
  {
    key: "delivery",
    title: "Delivery",
    body: "Marine-grade equipment delivered to your door — including remote islands by barge.",
  },
  {
    key: "installation",
    title: "Installation",
    body: "Our own certified crews install to industrial safety standards and commission the array.",
  },
  {
    key: "activation",
    title: "Activation",
    body: "We test the system, switch it on and hand over your troubleshooting manual.",
  },
  {
    key: "support",
    title: "Support 24/7",
    body: "Free lifetime remote monitoring with a 24/7 desk watching your production.",
  },
] as const;

/**
 * The warranty and monitoring clauses. They live with the rest of the bot's
 * knowledge so there is a single editable copy — see
 * `src/lib/bot-knowledge-model.ts`. Re-exported under this name because the
 * proposal writer and the marketing copy already import it.
 */
export const WARRANTY_TERMS = DEFAULT_BOT_KNOWLEDGE.warrantyTerms;

export const PALAWAN_LOCATIONS = [
  "Puerto Princesa",
  "El Nido",
  "San Vicente",
  "Coron",
  "Linapacan",
  "Taytay",
  "Roxas",
  "Brooke's Point",
  "Balabac",
  "Narra",
  "Busuanga",
  "Culion",
  "Other / Remote island",
];

export const PROPERTY_TYPES = [
  { value: "residential", label: "Residential home" },
  { value: "commercial", label: "Commercial / Resort / Hotel" },
  { value: "industrial_marine", label: "Industrial & Marine" },
  { value: "maintenance", label: "Maintenance / Monitoring only" },
];

export const GRID_STATES = [
  { value: "stable", label: "Grid is stable (rare outages)" },
  { value: "unstable", label: "Grid is unstable (daily brownouts)" },
  { value: "rationed", label: "Rationed power (scheduled hours only)" },
  { value: "generator", label: "Running on diesel generator" },
  { value: "off_grid", label: "Fully off-grid (no utility line)" },
];

export const TIMELINES = [
  { value: "immediate", label: "Immediate (within 30 days)" },
  { value: "planned", label: "Planned (next 3–6 months)" },
  { value: "exploring", label: "Budgeting / exploring" },
];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "audit_booked",
  "proposal_sent",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Assumptions used by the ROI engine (Palawan / MERALCO-equivalent island rates). */
export const ENERGY_ASSUMPTIONS = {
  gridTariffPhpPerKwh: 12.5,
  dieselTariffPhpPerKwh: 28.0,
  peakSunHours: 4.8,
  performanceRatio: 0.8,
  installedCostPhpPerKw: 72000,
  batteryCostPhpPerKwh: 26000,
  annualDegradation: 0.005,
  annualOmPhp: 6000,
};

/**
 * The grounding document handed to the LLM on every proposal request.
 *
 * `knowledge` is the owner's stored wording. Omit it and the shipped defaults
 * are used, which is what any code path without a database should get.
 */
export function buildKnowledgeDocument(
  knowledge: BotKnowledge = DEFAULT_BOT_KNOWLEDGE,
): string {
  const steps = STEPS.map((s) => `${s.id}. ${s.title} — ${s.body}`).join("\n");
  const verticals = VERTICALS.map(
    (v) => `- ${v.title}: ${v.blurb} Key points: ${v.bullets.join("; ")}.`,
  ).join("\n");
  const terms = knowledge.warrantyTerms.map((t) => `- ${t}`).join("\n");
  // The generic answer is how the bot declines, not a fact about the business,
  // so it is guidance for the fallback rather than reference material.
  const answers = BOT_TOPICS.filter((topic) => topic.key !== "generic")
    .map((topic) => `- ${topic.label}: ${knowledge.answers[topic.key]}`)
    .join("\n");

  return [
    "AMATES SOLUTIONS — COMPANY KNOWLEDGE BASE",
    knowledge.intro,
    "",
    "THE 4-STEP FRAMEWORK:",
    steps,
    "",
    "SERVICE VERTICALS:",
    verticals,
    "",
    "WARRANTY, MONITORING AND TERMS & CONDITIONS:",
    terms,
    "",
    "STANDARD ANSWERS THE OWNER WANTS GIVEN:",
    answers,
    ...(knowledge.extraFacts ? ["", "ADDITIONAL FACTS TO RESPECT:", knowledge.extraFacts] : []),
    "",
    "ROI ASSUMPTIONS (Palawan):",
    `- Grid tariff ≈ PHP ${ENERGY_ASSUMPTIONS.gridTariffPhpPerKwh}/kWh; diesel generator ≈ PHP ${ENERGY_ASSUMPTIONS.dieselTariffPhpPerKwh}/kWh.`,
    `- Peak sun hours ≈ ${ENERGY_ASSUMPTIONS.peakSunHours}; performance ratio ≈ ${ENERGY_ASSUMPTIONS.performanceRatio}.`,
    `- Installed cost ≈ PHP ${ENERGY_ASSUMPTIONS.installedCostPhpPerKw}/kW plus PHP ${ENERGY_ASSUMPTIONS.batteryCostPhpPerKwh}/kWh of storage.`,
  ].join("\n");
}
