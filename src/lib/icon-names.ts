/**
 * Icon NAME maps.
 *
 * Deliberately NOT a `"use client"` module: these plain objects are read by
 * server components. Exports of a `"use client"` module come back to the server
 * as client-reference proxies, so `STEP_ICONS[key]` evaluated server-side
 * silently returns undefined. Keep lookups in plain modules and pass only
 * strings across the boundary.
 */

/** Icons offered in the "Why Amates" card editor. */
export const REASON_ICON_CHOICES = [
  "Activity",
  "TrendingUp",
  "HeartHandshake",
  "ShieldCheck",
  "Zap",
  "Wrench",
  "Radio",
  "Gauge",
  "BadgeCheck",
  "Sparkles",
  "Leaf",
  "Cpu",
] as const;

/** Icons for the four framework steps, keyed by `Step.key`. */
export const STEP_ICONS: Record<string, string> = {
  audit: "ClipboardList",
  design: "PenTool",
  install: "HardHat",
  activation: "Zap",
};

/** Accent gradients for the vertical cards. */
export const VERTICAL_ICONS: Record<string, { icon: string; accent: string }> = {
  residential: { icon: "House", accent: "from-sky-400 to-sky-600" },
  commercial: { icon: "Building2", accent: "from-solar-300 to-solar-600" },
  industrial_marine: { icon: "Ship", accent: "from-teal-400 to-teal-600" },
  maintenance: { icon: "Wrench", accent: "from-violet-400 to-violet-600" },
};
