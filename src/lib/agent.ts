import "server-only";

import { db } from "@/db";
import { proposals, type Lead } from "@/db/schema";
import { getBotKnowledge } from "@/lib/bot-knowledge";
import { buildKnowledgeDocument, ENERGY_ASSUMPTIONS, STEPS, WARRANTY_TERMS } from "@/lib/knowledge";
import { chat } from "@/lib/openrouter";

export type RoiModel = {
  dailyUsageKwh: number;
  systemSizeKw: number;
  batteryKwh: number;
  estimatedCostPhp: number;
  monthlySavingsPhp: number;
  annualSavingsPhp: number;
  paybackYears: number;
  twentyFiveYearSavingsPhp: number;
  co2TonnesPerYear: number;
  tariffPhpPerKwh: number;
  assumptions: string[];
};

const php = (value: number) =>
  `PHP ${Math.round(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;

function tariffFor(gridState: string): number {
  if (gridState === "generator" || gridState === "off_grid") {
    return ENERGY_ASSUMPTIONS.dieselTariffPhpPerKwh;
  }
  if (gridState === "rationed") {
    return (ENERGY_ASSUMPTIONS.dieselTariffPhpPerKwh + ENERGY_ASSUMPTIONS.gridTariffPhpPerKwh) / 2;
  }
  return ENERGY_ASSUMPTIONS.gridTariffPhpPerKwh;
}

function autonomyFactor(gridState: string): number {
  switch (gridState) {
    case "off_grid":
      return 1.6;
    case "generator":
      return 1.3;
    case "rationed":
      return 1.1;
    case "unstable":
      return 0.9;
    default:
      return 0.5;
  }
}

/** Deterministic ROI engine — always runs, with or without an LLM. */
export function computeRoi(lead: Pick<Lead, "energyUsageKwh" | "monthlyBillPhp" | "gridState" | "propertyType">): RoiModel {
  const tariff = tariffFor(lead.gridState);
  const billPhp = Number(lead.monthlyBillPhp ?? 0);
  const statedKwh = Number(lead.energyUsageKwh ?? 0);

  const defaultByType: Record<string, number> = {
    residential: 450,
    commercial: 2600,
    industrial_marine: 9000,
    maintenance: 800,
  };

  const monthlyKwh =
    statedKwh > 0
      ? statedKwh
      : billPhp > 0
        ? billPhp / tariff
        : (defaultByType[lead.propertyType] ?? 600);

  const dailyUsageKwh = monthlyKwh / 30;
  const productionPerKw = ENERGY_ASSUMPTIONS.peakSunHours * ENERGY_ASSUMPTIONS.performanceRatio;

  const rawSize = dailyUsageKwh / productionPerKw;
  const systemSizeKw = Math.max(3, Math.round(rawSize * 2) / 2);
  const batteryKwh = Math.max(5, Math.round(dailyUsageKwh * autonomyFactor(lead.gridState)));

  const estimatedCostPhp =
    systemSizeKw * ENERGY_ASSUMPTIONS.installedCostPhpPerKw +
    batteryKwh * ENERGY_ASSUMPTIONS.batteryCostPhpPerKwh;

  const annualProductionKwh = systemSizeKw * productionPerKw * 365;
  const offsetKwh = Math.min(annualProductionKwh, monthlyKwh * 12);
  const annualSavingsPhp = Math.max(
    0,
    offsetKwh * tariff - ENERGY_ASSUMPTIONS.annualOmPhp,
  );
  const monthlySavingsPhp = annualSavingsPhp / 12;
  const paybackYears = annualSavingsPhp > 0 ? estimatedCostPhp / annualSavingsPhp : 25;

  let cumulative = 0;
  for (let year = 1; year <= 25; year += 1) {
    cumulative += annualSavingsPhp * (1 - ENERGY_ASSUMPTIONS.annualDegradation) ** (year - 1);
  }

  return {
    dailyUsageKwh: Number(dailyUsageKwh.toFixed(2)),
    systemSizeKw,
    batteryKwh,
    estimatedCostPhp: Math.round(estimatedCostPhp),
    monthlySavingsPhp: Math.round(monthlySavingsPhp),
    annualSavingsPhp: Math.round(annualSavingsPhp),
    paybackYears: Number(paybackYears.toFixed(2)),
    twentyFiveYearSavingsPhp: Math.round(cumulative - estimatedCostPhp),
    co2TonnesPerYear: Number(((annualProductionKwh * 0.68) / 1000).toFixed(2)),
    tariffPhpPerKwh: tariff,
    assumptions: [
      `${ENERGY_ASSUMPTIONS.peakSunHours} peak sun hours, ${ENERGY_ASSUMPTIONS.performanceRatio * 100}% performance ratio`,
      `Energy priced at ${php(tariff)}/kWh for this grid state`,
      `Installed cost ${php(ENERGY_ASSUMPTIONS.installedCostPhpPerKw)}/kW + ${php(ENERGY_ASSUMPTIONS.batteryCostPhpPerKwh)}/kWh storage`,
      `${ENERGY_ASSUMPTIONS.annualDegradation * 100}% annual degradation, ${php(ENERGY_ASSUMPTIONS.annualOmPhp)}/yr O&M`,
    ],
  };
}

function fallbackProposal(lead: Lead, roi: RoiModel): string {
  const steps = STEPS.map((step) => `**${step.id}. ${step.title}** — ${step.short}`).join("\n");
  return [
    `## Solar Hybrid Proposal — ${lead.contactName}`,
    `**Site:** ${lead.location}, Palawan · **Segment:** ${lead.propertyType.replace("_", " & ")} · **Grid state:** ${lead.gridState.replace("_", " ")}`,
    "",
    "### Recommended configuration",
    `- Array: **${roi.systemSizeKw} kWp** marine-grade hybrid solar`,
    `- Storage: **${roi.batteryKwh} kWh** LiFePO₄ battery bank`,
    `- Estimated daily consumption: **${roi.dailyUsageKwh} kWh/day**`,
    `- Turnkey investment: **${php(roi.estimatedCostPhp)}**`,
    "",
    "### Return on investment",
    `- Monthly savings: **${php(roi.monthlySavingsPhp)}**`,
    `- Annual savings: **${php(roi.annualSavingsPhp)}**`,
    `- Simple payback: **${roi.paybackYears} years**`,
    `- 25-year net benefit: **${php(roi.twentyFiveYearSavingsPhp)}**`,
    `- CO₂ avoided: **${roi.co2TonnesPerYear} tonnes/year**`,
    "",
    "### How we deliver it",
    steps,
    "",
    "### Warranty & monitoring",
    WARRANTY_TERMS.map((term) => `- ${term}`).join("\n"),
  ].join("\n");
}

export type GeneratedProposal = {
  leadId: number;
  proposalId: number;
  engine: "openrouter" | "deterministic";
  model: string;
  summary: string;
  content: string;
  roi: RoiModel;
  warning?: string;
};

/**
 * Generates a grounded proposal + ROI for a lead and persists it.
 * Falls back to the deterministic engine when OpenRouter is unavailable so the
 * endpoint never hard-fails on the sales floor.
 */
export async function generateProposal(lead: Lead, overrideModel?: string): Promise<GeneratedProposal> {
  const roi = computeRoi(lead);
  // The owner's stored wording, so a proposal and a WhatsApp reply never quote
  // different warranties or different coverage.
  const knowledge = await getBotKnowledge();

  const systemPrompt = [
    "You are the Amates Solutions senior solar design consultant for Palawan, Philippines.",
    "Write client-ready proposals in Markdown. Be concrete, commercial and honest.",
    "Always ground the proposal in the 4-step framework, the correct vertical, and the warranty/monitoring terms.",
    "Never promise monitoring without WIFI, and always restate that only Amates may modify the system.",
    "Use PHP currency. Keep the whole proposal under 600 words.",
    "",
    buildKnowledgeDocument(knowledge),
  ].join("\n");

  const userPrompt = [
    "Create a proposal for this lead.",
    "",
    `Name: ${lead.contactName}`,
    `Property type: ${lead.propertyType}`,
    `Location: ${lead.location}, Palawan`,
    `Monthly usage: ${lead.energyUsageKwh ?? "not stated"} kWh`,
    `Monthly bill: ${lead.monthlyBillPhp ?? "not stated"} PHP`,
    `Grid state: ${lead.gridState}`,
    `Timeline: ${lead.timeline}`,
    `Notes: ${lead.notes ?? "none"}`,
    `Source channel: ${lead.sourceChannel}`,
    "",
    "Pre-computed engineering + ROI figures (use these numbers exactly, do not recalculate):",
    JSON.stringify(roi, null, 2),
    "",
    "Structure: H2 title, 'Recommended configuration', 'Return on investment' (table), 'Our 4-step delivery', 'Warranty & monitoring', then a short call to action for a free site audit.",
  ].join("\n");

  const result = await chat(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    overrideModel,
  );

  const usedLlm = result.ok;
  const content = result.ok ? result.content : fallbackProposal(lead, roi);
  const summary = `${roi.systemSizeKw} kWp + ${roi.batteryKwh} kWh storage · ${php(roi.estimatedCostPhp)} · payback ${roi.paybackYears} yrs`;

  const [row] = await db
    .insert(proposals)
    .values({
      leadId: lead.id,
      model: result.model,
      engine: usedLlm ? "openrouter" : "deterministic",
      systemSizeKw: String(roi.systemSizeKw),
      batteryKwh: String(roi.batteryKwh),
      estimatedCostPhp: String(roi.estimatedCostPhp),
      monthlySavingsPhp: String(roi.monthlySavingsPhp),
      paybackYears: String(roi.paybackYears),
      summary,
      content,
      roi,
    })
    .returning();

  return {
    leadId: lead.id,
    proposalId: row.id,
    engine: usedLlm ? "openrouter" : "deterministic",
    model: result.model,
    summary,
    content,
    roi,
    warning: result.ok ? undefined : result.error,
  };
}
