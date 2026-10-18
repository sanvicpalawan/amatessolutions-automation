import "server-only";

import { GRID_STATES, PALAWAN_LOCATIONS, PROPERTY_TYPES, TIMELINES } from "@/lib/knowledge";
import type { NewLead } from "@/db/schema";

export type IntakePayload = Record<string, unknown>;

const propertyValues = PROPERTY_TYPES.map((p) => p.value);
const gridValues = GRID_STATES.map((g) => g.value);
const timelineValues = TIMELINES.map((t) => t.value);

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function num(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(2) : null;
}

export type ValidationResult =
  | { ok: true; lead: NewLead }
  | { ok: false; errors: Record<string, string> };

export type NormalizeOptions = {
  /**
   * Whether a usage figure (kWh or monthly bill) is required.
   *
   * True for the website quote form, which asks for it. False for WhatsApp,
   * where the message is free text: a guest who opens with "hi" must still
   * become a lead — the agent asks for the bill in its reply instead of dropping
   * the message. Without this, free-text intake had to invent a bill (see the
   * `monthlyBillPhp` note in `parseWhatsappMessage`) just to pass validation.
   */
  requireUsage?: boolean;
};

/** Normalises + validates an intake payload from either the web form or WhatsApp. */
export function normalizeLead(
  payload: IntakePayload,
  sourceChannel: string,
  options: NormalizeOptions = {},
): ValidationResult {
  const requireUsage = options.requireUsage ?? true;
  const errors: Record<string, string> = {};

  const contactName = str(payload.contactName) || str(payload.name);
  const contactWhatsapp = str(payload.contactWhatsapp) || str(payload.whatsapp) || str(payload.phone);
  const contactEmail = str(payload.contactEmail) || str(payload.email);
  const propertyTypeRaw = str(payload.propertyType).toLowerCase();
  const location = str(payload.location) || "Puerto Princesa";
  const gridStateRaw = str(payload.gridState).toLowerCase();
  const timelineRaw = str(payload.timeline).toLowerCase();

  if (contactName.length < 2) errors.contactName = "Please tell us your name.";
  if (!/^[+0-9()\s-]{7,20}$/.test(contactWhatsapp)) {
    errors.contactWhatsapp = "Enter a valid WhatsApp number including country code.";
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    errors.contactEmail = "That email address does not look right.";
  }
  if (!propertyValues.includes(propertyTypeRaw)) errors.propertyType = "Choose a property type.";
  if (!location) errors.location = "Choose your location in Palawan.";
  if (!gridValues.includes(gridStateRaw)) errors.gridState = "Tell us about your grid situation.";

  const energyUsageKwh = num(payload.energyUsageKwh ?? payload.usage);
  const monthlyBillPhp = num(payload.monthlyBillPhp ?? payload.bill);
  if (requireUsage && !energyUsageKwh && !monthlyBillPhp) {
    errors.energyUsageKwh = "Give us either monthly kWh or your monthly bill.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    lead: {
      contactName,
      contactEmail: contactEmail || null,
      contactWhatsapp,
      propertyType: propertyTypeRaw,
      location: PALAWAN_LOCATIONS.includes(location) ? location : location.slice(0, 80),
      energyUsageKwh,
      monthlyBillPhp,
      gridState: gridStateRaw,
      timeline: timelineValues.includes(timelineRaw) ? timelineRaw : "exploring",
      notes: str(payload.notes) || null,
      sourceChannel,
      status: "new",
      rawPayload: payload as object,
    },
  };
}

/**
 * Best-effort parser for inbound WhatsApp messages, e.g.
 * "Hi, I'm Ana. Resort in El Nido, 1800 kwh, generator power, +639170001111"
 */
export function parseWhatsappMessage(text: string, from: string): IntakePayload {
  const lower = text.toLowerCase();

  const property =
    /resort|hotel|restaurant|store|shop|business|commercial/.test(lower)
      ? "commercial"
      : /factory|boat|marine|port|warehouse|industrial|cold ?stor/.test(lower)
        ? "industrial_marine"
        : /maintenance|repair|clean|monitor|service/.test(lower)
          ? "maintenance"
          : "residential";

  const grid = /off ?grid|no electricity|no line/.test(lower)
    ? "off_grid"
    : /generator|genset|diesel/.test(lower)
      ? "generator"
      : /ration|scheduled|only at night|6pm/.test(lower)
        ? "rationed"
        : /brownout|unstable|outage|blackout/.test(lower)
          ? "unstable"
          : "stable";

  const location =
    PALAWAN_LOCATIONS.find((place) => lower.includes(place.toLowerCase())) ?? "Puerto Princesa";

  const kwh = /([\d,.]+)\s*kwh/i.exec(text)?.[1]?.replace(/,/g, "");
  // Customers write money both ways — "PHP 80,000" and "80000 pesos".
  const bill =
    /(?:php|peso|₱)\s*([\d,.]+)/i.exec(text)?.[1]?.replace(/,/g, "") ??
    /([\d,.]+)\s*(?:php|pesos?|₱)\b/i.exec(text)?.[1]?.replace(/,/g, "");
  // Find the trigger case-insensitively, then require the name itself to be
  // capitalised, so "I am ana" does not store "ana" and "I am Ana. Resort in El
  // Nido" stores only "Ana" rather than running on into the sentence.
  const nameTrigger = /(?:i'?m|i am|name(?:'s| is)|this is)\s+/i.exec(text);
  const name = nameTrigger
    ? /^([A-Z][A-Za-z'\-]*(?:\s+[A-Z][A-Za-z'\-]*){0,2})/.exec(
        text.slice(nameTrigger.index + nameTrigger[0].length),
      )?.[1]
    : undefined;

  return {
    contactName: name || `WhatsApp ${from.slice(-4)}`,
    contactWhatsapp: from,
    propertyType: property,
    location,
    gridState: grid,
    energyUsageKwh: kwh ?? null,
    // Never invent a consumption figure. This used to default to "6000" when a
    // message mentioned no bill, so a message as bare as "hi" produced a
    // confident estimate that sized a dive resort like a family house.
    // `computeRoi` already falls back to typical use for the property type, and
    // the reply says so when we have no real numbers.
    monthlyBillPhp: bill ?? null,
    timeline: /asap|urgent|immediately|now/.test(lower) ? "immediate" : "exploring",
    notes: text.slice(0, 500),
  };
}
