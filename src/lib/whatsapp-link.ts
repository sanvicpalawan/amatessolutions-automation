/**
 * WhatsApp number helpers — shared by the floating chat button and the footer.
 *
 * The seeded site ships a placeholder number so the layout is never empty. A
 * link to a number nobody owns is worse than no link at all: a visitor taps it
 * and lands in a dead end. Everything that renders a WhatsApp link therefore
 * checks `isPlaceholderWhatsapp()` first and stays hidden until a real number
 * is typed into the Site editor.
 */

export const PLACEHOLDER_WHATSAPP = "+63 917 123 4567";

/** Digits only — `wa.me` links never accept spaces, dashes or a leading `+`. */
export function whatsappDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/[^0-9]/g, "");
}

/** True when the number is empty or still the seeded placeholder. */
export function isPlaceholderWhatsapp(value: string | null | undefined): boolean {
  const digits = whatsappDigits(value);
  if (!digits) return true;
  return digits === whatsappDigits(PLACEHOLDER_WHATSAPP);
}

/** True when a stored wa.me / whatsapp.com URL still points at the placeholder. */
export function isPlaceholderWhatsappUrl(url: string): boolean {
  if (!/wa\.me|whatsapp\.com|api\.whatsapp\.com/i.test(url)) return false;
  return isPlaceholderWhatsapp(url);
}
