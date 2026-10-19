/**
 * Money handling for the finance ledger.
 *
 * Every amount is stored and passed around as an **integer number of minor
 * units** (centavos). Nothing in the ledger is ever a float: adding 0.1 + 0.2
 * in a profit column is how books stop agreeing with the bank. Floats only
 * appear inside these formatters, where the result is a string.
 *
 * This module is deliberately not `server-only` — the admin UI formats money
 * too.
 */

export const CURRENCIES = ["PHP", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

const SYMBOLS: Record<string, string> = { PHP: "\u20B1", USD: "$" };

/** "1,250.50", "1250.5" or 1250.5 all become 125050 centavos. Garbage becomes 0. */
export function toMinor(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  const raw =
    typeof input === "number" ? input : Number(String(input).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(raw)) return 0;
  return Math.round(raw * 100);
}

/** 125050 becomes "1,250.50"; whole pesos drop the decimals. */
export function fromMinor(minor: number): string {
  const value = (minor || 0) / 100;
  const whole = Math.abs(value % 1) < 0.005;
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** 125050 becomes "₱1,250.50". Negative amounts keep the sign outside the symbol. */
export function money(minor: number, currency: string = "PHP"): string {
  const symbol = SYMBOLS[currency] ?? "";
  const abs = Math.abs(minor || 0);
  return `${(minor || 0) < 0 ? "-" : ""}${symbol}${fromMinor(abs)}`;
}

/** 25.5 becomes "25.5%". Used for margins. */
export function percent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? rounded : rounded.toFixed(1)}%`;
}

/**
 * Converts an amount into pesos.
 *
 * A 0 rate means the owner has not set one, so a foreign amount cannot be
 * converted honestly. Returning 0 keeps the number obviously wrong rather than
 * silently plausible, and the UI shows a prompt alongside it.
 */
export function toPhp(minor: number, currency: string, usdToPhp: number): number {
  if (currency === "PHP") return minor || 0;
  if (!usdToPhp) return 0;
  return Math.round((minor || 0) * usdToPhp);
}
