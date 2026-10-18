"use client";

import { usePathname } from "next/navigation";

import { SocialIcon } from "@/lib/social";
import { isPlaceholderWhatsapp, whatsappDigits } from "@/lib/whatsapp-link";

/**
 * Floating WhatsApp button, shown on every public page.
 *
 * Driven by the Site editor's footer WhatsApp field, so it turns itself on the
 * moment a real number is saved — and stays hidden while the field is empty or
 * still holds the seeded placeholder number (a link to a number nobody owns is
 * a dead end for the visitor).
 *
 * Hidden inside the backoffice: it is a customer-facing affordance, not admin.
 */
export default function WhatsAppButton({
  number,
  message,
}: {
  number: string;
  message?: string;
}) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;
  if (isPlaceholderWhatsapp(number)) return null;

  const suffix = message ? `?text=${encodeURIComponent(message)}` : "";

  return (
    <a
      href={`https://wa.me/${whatsappDigits(number)}${suffix}`}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/25 transition hover:scale-105 hover:bg-[#1ebe5b]"
    >
      <SocialIcon name="WhatsApp" className="h-7 w-7" />
    </a>
  );
}
