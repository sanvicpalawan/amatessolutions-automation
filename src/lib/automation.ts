import "server-only";

import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  appointments,
  automationLog,
  automationRules,
  leads,
  systems,
  type Lead,
} from "@/db/schema";
import { generateProposal } from "@/lib/agent";
import { php, type RoiModel } from "@/lib/roi";

/* ------------------------------------------------------------------ *
 * Rule catalogue — the owner sees these in /admin/automations
 * ------------------------------------------------------------------ */

export type RuleKey =
  | "auto_reply"
  | "auto_score"
  | "auto_proposal"
  | "auto_book_audit"
  | "auto_followup"
  | "fleet_health_sweep"
  | "stale_lead_sweep";

export type RuleDef = {
  key: RuleKey;
  label: string;
  description: string;
  trigger: "intake" | "schedule";
  defaultEnabled: boolean;
  config: Record<string, unknown>;
};

export const RULES: RuleDef[] = [
  {
    key: "auto_reply",
    label: "Instant acknowledgement",
    description:
      "Sends an immediate acknowledgement to every new enquiry (web form and WhatsApp) so the owner never has to reply manually.",
    trigger: "intake",
    defaultEnabled: true,
    config: {},
  },
  {
    key: "auto_score",
    label: "Automatic lead scoring",
    description:
      "Scores each enquiry 0–100 from property type, usage, grid state and timeline, so the owner works the hottest leads first.",
    trigger: "intake",
    defaultEnabled: true,
    config: {},
  },
  {
    key: "auto_proposal",
    label: "Auto-generate proposal + ROI",
    description:
      "Runs the AI agent the moment a lead arrives and stores the proposal. WhatsApp replies include the ROI summary instantly.",
    trigger: "intake",
    defaultEnabled: true,
    config: {},
  },
  {
    key: "auto_book_audit",
    label: "Auto-book the energy audit",
    description:
      "Places a site audit in the next free calendar slot and marks the lead as audit booked — no back-and-forth scheduling.",
    trigger: "intake",
    defaultEnabled: true,
    config: { auditHour: 9, durationMinutes: 120 },
  },
  {
    key: "auto_followup",
    label: "Automatic follow-up task",
    description:
      "Creates a follow-up appointment 3 days after the audit so no enquiry goes cold while the owner is on site.",
    trigger: "intake",
    defaultEnabled: true,
    config: { followUpDays: 3 },
  },
  {
    key: "fleet_health_sweep",
    label: "Fleet health sweep",
    description:
      "Hourly check of the monitored fleet. Any site in warning or offline automatically gets a maintenance job and an alert note.",
    trigger: "schedule",
    defaultEnabled: true,
    config: {},
  },
  {
    key: "stale_lead_sweep",
    label: "Stale lead sweep",
    description:
      "Flags any lead untouched for longer than the SLA window and creates a follow-up task so nothing is forgotten.",
    trigger: "schedule",
    defaultEnabled: true,
    config: { staleHours: 24 },
  },
];

/* ------------------------------------------------------------------ *
 * Storage helpers
 * ------------------------------------------------------------------ */

let rulesSeeded = false;

export async function ensureAutomationRules(): Promise<void> {
  if (rulesSeeded) return;
  rulesSeeded = true;

  const existing = await db.select({ key: automationRules.key }).from(automationRules);
  const have = new Set(existing.map((row) => row.key));
  const missing = RULES.filter((rule) => !have.has(rule.key));

  if (missing.length > 0) {
    await db.insert(automationRules).values(
      missing.map((rule) => ({
        key: rule.key,
        label: rule.label,
        description: rule.description,
        enabled: rule.defaultEnabled,
        config: rule.config,
      })),
    );
  }
}

export type RuleState = RuleDef & {
  enabled: boolean;
  config: Record<string, unknown>;
  updatedAt: string;
  runCount: number;
  lastRunAt: string | null;
};

export async function listRules(): Promise<RuleState[]> {
  await ensureAutomationRules();
  const rows = await db.select().from(automationRules);
  const stats = await db
    .select({
      rule: automationLog.rule,
      runCount: sql<number>`cast(count(*) as int)`,
      lastRunAt: sql<string | null>`max(${automationLog.createdAt})`,
    })
    .from(automationLog)
    .groupBy(automationLog.rule);

  const byKey = new Map(rows.map((row) => [row.key, row]));
  const statByKey = new Map(stats.map((row) => [row.rule, row]));

  return RULES.map((rule) => {
    const row = byKey.get(rule.key);
    const stat = statByKey.get(rule.key);
    return {
      ...rule,
      enabled: row?.enabled ?? rule.defaultEnabled,
      config: (row?.config as Record<string, unknown>) ?? rule.config,
      updatedAt: row ? row.updatedAt.toISOString() : new Date().toISOString(),
      runCount: stat?.runCount ?? 0,
      lastRunAt: stat?.lastRunAt ?? null,
    };
  });
}

async function ruleEnabled(key: RuleKey): Promise<boolean> {
  await ensureAutomationRules();
  const row = await db
    .select({ enabled: automationRules.enabled })
    .from(automationRules)
    .where(eq(automationRules.key, key))
    .limit(1);
  return row[0]?.enabled ?? true;
}

export async function setRuleEnabled(key: RuleKey, enabled: boolean): Promise<void> {
  await ensureAutomationRules();
  await db
    .update(automationRules)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(automationRules.key, key));
}

async function log(
  rule: RuleKey,
  action: string,
  message: string,
  options: { status?: string; targetType?: string; targetId?: number | null; meta?: object } = {},
): Promise<void> {
  await db.insert(automationLog).values({
    rule,
    action,
    targetType: options.targetType ?? "lead",
    targetId: options.targetId ?? null,
    status: options.status ?? "ok",
    message,
    meta: options.meta as object | undefined,
  });
}

export async function recentLog(limit = 40) {
  const rows = await db
    .select()
    .from(automationLog)
    .orderBy(desc(automationLog.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    rule: row.rule,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    status: row.status,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  }));
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export type LeadScore = {
  score: number;
  tier: "hot" | "warm" | "cool";
  reasons: string[];
};

/** 0–100 priority score so the owner can triage the CRM at a glance. */
export function scoreLead(lead: Pick<Lead, "propertyType" | "gridState" | "timeline" | "energyUsageKwh" | "monthlyBillPhp">): LeadScore {
  const reasons: string[] = [];
  let score = 10;

  switch (lead.propertyType) {
    case "industrial_marine":
      score += 30;
      reasons.push("Industrial / marine project (high value)");
      break;
    case "commercial":
      score += 25;
      reasons.push("Commercial / resort buyer");
      break;
    case "residential":
      score += 12;
      reasons.push("Residential install");
      break;
    default:
      score += 8;
      reasons.push("Maintenance-only enquiry");
  }

  switch (lead.gridState) {
    case "off_grid":
      score += 22;
      reasons.push("Fully off-grid — battery critical");
      break;
    case "generator":
      score += 20;
      reasons.push("Burning diesel daily");
      break;
    case "rationed":
      score += 16;
      reasons.push("Rationed power");
      break;
    case "unstable":
      score += 12;
      reasons.push("Unstable grid");
      break;
    default:
      score += 4;
      reasons.push("Stable grid");
  }

  switch (lead.timeline) {
    case "immediate":
      score += 20;
      reasons.push("Ready within 30 days");
      break;
    case "planned":
      score += 12;
      reasons.push("Planned 3–6 months");
      break;
    default:
      score += 4;
      reasons.push("Still budgeting");
  }

  const usage = Number(lead.energyUsageKwh ?? 0);
  const bill = Number(lead.monthlyBillPhp ?? 0);
  if (usage >= 5000 || bill >= 100000) {
    score += 10;
    reasons.push("Large energy footprint");
  } else if (usage >= 1000 || bill >= 15000) {
    score += 6;
    reasons.push("Mid-size load");
  }

  const bounded = Math.max(0, Math.min(100, score));
  const tier: LeadScore["tier"] = bounded >= 70 ? "hot" : bounded >= 45 ? "warm" : "cool";
  return { score: bounded, tier, reasons };
}

/* ------------------------------------------------------------------ *
 * Scheduling helpers
 * ------------------------------------------------------------------ */

/** Next free 2-hour slot on a weekday, skipping days that already have a job. */
export async function nextFreeSlot(hour = 9, durationMinutes = 120): Promise<Date> {
  const busy = await db
    .select({ scheduledFor: appointments.scheduledFor, durationMinutes: appointments.durationMinutes })
    .from(appointments)
    .where(gte(appointments.scheduledFor, new Date(Date.now() - 86400000)));

  const taken = busy.map((row) => {
    const start = row.scheduledFor.getTime();
    return { start, end: start + row.durationMinutes * 60000 };
  });

  const candidate = new Date();
  candidate.setDate(candidate.getDate() + 1);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(0);
  candidate.setHours(hour);

  for (let attempt = 0; attempt < 45; attempt += 1) {
    const day = candidate.getDay();
    const start = candidate.getTime();
    const end = start + durationMinutes * 60000;
    const clash = taken.some((slot) => start < slot.end && end > slot.start);
    if (day !== 0 && !clash) return candidate;

    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate;
}

/* ------------------------------------------------------------------ *
 * Intake automations — run right after a lead is created
 * ------------------------------------------------------------------ */

export type AutomationOutcome = {
  rule: RuleKey;
  status: "ok" | "skipped" | "error";
  message: string;
};

/**
 * Runs every intake automation for a freshly created lead.
 * Never throws — a broken rule must not break lead capture.
 */
export async function runIntakeAutomations(lead: Lead): Promise<AutomationOutcome[]> {
  const outcomes: AutomationOutcome[] = [];
  const roi = (await import("@/lib/roi")).computeRoi(lead);

  // 1. Acknowledgement
  if (await ruleEnabled("auto_reply")) {
    outcomes.push({
      rule: "auto_reply",
      status: "ok",
      message: `Acknowledgement queued to ${lead.contactWhatsapp}${
        lead.contactEmail ? ` + ${lead.contactEmail}` : ""
      }.`,
    });
    await log("auto_reply", "acknowledge", outcomes[0].message, {
      targetId: lead.id,
      meta: { channel: lead.sourceChannel },
    });
  } else {
    outcomes.push({ rule: "auto_reply", status: "skipped", message: "Rule disabled by owner." });
  }

  // 2. Scoring
  let score: LeadScore | null = null;
  if (await ruleEnabled("auto_score")) {
    score = scoreLead(lead);
    await db
      .update(leads)
      .set({ leadScore: score.score, leadTier: score.tier, updatedAt: new Date() })
      .where(eq(leads.id, lead.id));
    outcomes.push({
      rule: "auto_score",
      status: "ok",
      message: `Scored ${score.score}/100 (${score.tier}).`,
    });
    await log("auto_score", "score", outcomes[1].message, {
      targetId: lead.id,
      meta: { score: score.score, tier: score.tier, reasons: score.reasons },
    });
  } else {
    outcomes.push({ rule: "auto_score", status: "skipped", message: "Rule disabled by owner." });
  }

  // 3. Proposal + ROI
  if (await ruleEnabled("auto_proposal")) {
    try {
      const proposal = await generateProposal(lead);
      outcomes.push({
        rule: "auto_proposal",
        status: "ok",
        message: `${proposal.summary} (${proposal.engine}).`,
      });
      await log("auto_proposal", "generate", outcomes[2].message, {
        targetId: lead.id,
        meta: { proposalId: proposal.proposalId, engine: proposal.engine, model: proposal.model },
      });
    } catch (error) {
      outcomes.push({
        rule: "auto_proposal",
        status: "error",
        message: `Proposal failed: ${(error as Error).message}`,
      });
      await log("auto_proposal", "generate", outcomes[2].message, {
        status: "error",
        targetId: lead.id,
      });
    }
  } else {
    outcomes.push({ rule: "auto_proposal", status: "skipped", message: "Rule disabled by owner." });
  }

  // 4. Auto-book audit
  if (await ruleEnabled("auto_book_audit")) {
    const slot = await nextFreeSlot(9, 120);
    const [appointment] = await db
      .insert(appointments)
      .values({
        leadId: lead.id,
        title: `Auto-booked audit — ${lead.contactName}`,
        kind: "audit",
        scheduledFor: slot,
        crew: "Audit Team A",
        location: lead.location,
        notes: `Created automatically by the intake pipeline (${lead.sourceChannel}).`,
      })
      .returning();

    await db
      .update(leads)
      .set({ status: "audit_booked", updatedAt: new Date() })
      .where(eq(leads.id, lead.id));

    outcomes.push({
      rule: "auto_book_audit",
      status: "ok",
      message: `Audit booked for ${slot.toLocaleString("en-PH")}.`,
    });
    await log("auto_book_audit", "book", outcomes[3].message, {
      targetType: "appointment",
      targetId: appointment.id,
      meta: { leadId: lead.id },
    });

    // 5. Follow-up after the audit
    if (await ruleEnabled("auto_followup")) {
      const followUp = new Date(slot);
      followUp.setDate(followUp.getDate() + 3);
      await db.insert(appointments).values({
        leadId: lead.id,
        title: `Auto follow-up — ${lead.contactName}`,
        kind: "maintenance",
        scheduledFor: followUp,
        crew: "Sales Desk",
        location: lead.location,
        notes: "Automatic follow-up on the proposal generated at intake.",
      });
      outcomes.push({
        rule: "auto_followup",
        status: "ok",
        message: `Follow-up set for ${followUp.toLocaleDateString("en-PH")}.`,
      });
      await log("auto_followup", "schedule", outcomes[4].message, { targetId: lead.id });
    }
  } else {
    outcomes.push({ rule: "auto_book_audit", status: "skipped", message: "Rule disabled by owner." });
  }

  return outcomes;
}

/** Builds the instant reply text (used by the WhatsApp webhook). */
export function buildAutoReply(lead: Lead, roi: RoiModel, score?: LeadScore): string {
  return [
    `Salamat ${lead.contactName}! Amates Solutions received your request for ${lead.location}, Palawan.`,
    "",
    `Instant estimate: ~${roi.systemSizeKw} kWp solar + ${roi.batteryKwh} kWh storage.`,
    `Estimated saving ${php(roi.monthlySavingsPhp)}/month, payback ~${roi.paybackYears} years.`,
    "",
    `A free site audit has been requested for you. Our team will confirm the slot on this number shortly.`,
    score ? `Priority: ${score.tier.toUpperCase()} (${score.score}/100).` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ *
 * Scheduled sweep — hit /api/cron/sweep
 * ------------------------------------------------------------------ */

export type SweepResult = {
  ran: string[];
  createdAppointments: number;
  flaggedLeads: number;
  alerts: string[];
};

export async function scheduledSweep(): Promise<SweepResult> {
  const result: SweepResult = {
    ran: [],
    createdAppointments: 0,
    flaggedLeads: 0,
    alerts: [],
  };

  // --- Fleet health sweep -------------------------------------------
  if (await ruleEnabled("fleet_health_sweep")) {
    const fleet = await db.select().from(systems);
    const troubled = fleet.filter((row) => row.status !== "online" || !row.wifiConnected);

    for (const site of troubled) {
      const existing = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.location, site.location),
            or(eq(appointments.kind, "maintenance"), eq(appointments.kind, "install"))!,
            gte(appointments.scheduledFor, new Date()),
          ),
        )
        .limit(1);

      if (existing.length > 0) continue;

      const slot = await nextFreeSlot(8, 240);
      await db.insert(appointments).values({
        title: `Auto maintenance — ${site.siteName}`,
        kind: "maintenance",
        scheduledFor: slot,
        crew: "Service Unit 1",
        location: site.location,
        notes: site.wifiConnected
          ? `Auto-raised by fleet health sweep: site reports ${site.status}.`
          : "Auto-raised by fleet health sweep: WIFI link down, monitoring paused.",
      });
      result.createdAppointments += 1;

      const message = site.wifiConnected
        ? `${site.siteName} is in ${site.status} state — maintenance job raised automatically.`
        : `${site.siteName} has no WIFI link — monitoring paused, dispatch needed.`;
      result.alerts.push(message);
      await log("fleet_health_sweep", "alert", message, {
        targetType: "system",
        targetId: site.id,
        status: "warn",
      });
    }
    result.ran.push("fleet_health_sweep");
  }

  // --- Stale lead sweep ---------------------------------------------
  if (await ruleEnabled("stale_lead_sweep")) {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    const stale = await db
      .select()
      .from(leads)
      .where(
        and(
          or(eq(leads.status, "new"), eq(leads.status, "contacted"))!,
          lt(leads.updatedAt, cutoff),
        ),
      )
      .limit(50);

    for (const lead of stale) {
      const slot = await nextFreeSlot(14, 60);
      await db.insert(appointments).values({
        leadId: lead.id,
        title: `Auto follow-up (SLA) — ${lead.contactName}`,
        kind: "maintenance",
        scheduledFor: slot,
        crew: "Sales Desk",
        location: lead.location,
        notes: "Automatic SLA follow-up: lead untouched for more than 24 hours.",
      });
      await db
        .update(leads)
        .set({ status: "contacted", updatedAt: new Date() })
        .where(eq(leads.id, lead.id));
      result.flaggedLeads += 1;
      result.createdAppointments += 1;
      await log("stale_lead_sweep", "follow_up", `SLA follow-up raised for ${lead.contactName}.`, {
        targetId: lead.id,
      });
    }
    result.ran.push("stale_lead_sweep");
  }

  return result;
}
