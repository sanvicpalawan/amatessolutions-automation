"use client";

import {
  siFacebook,
  siGithub,
  siInstagram,
  siTelegram,
  siTiktok,
  siWhatsapp,
  siX,
  siYoutube,
} from "simple-icons";
import { AtSign, Briefcase, Globe, Mail, Phone, Rss, type LucideIcon } from "lucide-react";

/**
 * Social platform icons.
 *
 * IMPORTANT: Lucide removed all brand logos in v1.0, so there are no official
 * Lucide Facebook / Instagram / GitHub / YouTube glyphs to use. The brand marks
 * below are the official brand SVG paths from Simple Icons (sourced from each
 * brand's own guidelines); generic platforms fall back to Lucide glyphs.
 */

export type BrandIcon = {
  kind: "brand";
  path: string;
  title: string;
  brandColor: string;
};

export type GlyphIcon = {
  kind: "glyph";
  Component: LucideIcon;
};

export type SocialIconDef = BrandIcon | GlyphIcon;

export const SOCIAL_ICONS: Record<string, SocialIconDef> = {
  Instagram: { kind: "brand", path: siInstagram.path, title: siInstagram.title, brandColor: `#${siInstagram.hex}` },
  Facebook: { kind: "brand", path: siFacebook.path, title: siFacebook.title, brandColor: `#${siFacebook.hex}` },
  GitHub: { kind: "brand", path: siGithub.path, title: siGithub.title, brandColor: `#${siGithub.hex}` },
  YouTube: { kind: "brand", path: siYoutube.path, title: siYoutube.title, brandColor: `#${siYoutube.hex}` },
  // LinkedIn asked to be removed from open icon sets, so it uses a Lucide glyph.
  LinkedIn: { kind: "glyph", Component: Briefcase },
  "X (Twitter)": { kind: "brand", path: siX.path, title: siX.title, brandColor: `#${siX.hex}` },
  TikTok: { kind: "brand", path: siTiktok.path, title: siTiktok.title, brandColor: `#${siTiktok.hex}` },
  WhatsApp: { kind: "brand", path: siWhatsapp.path, title: siWhatsapp.title, brandColor: `#${siWhatsapp.hex}` },
  Telegram: { kind: "brand", path: siTelegram.path, title: siTelegram.title, brandColor: `#${siTelegram.hex}` },
  Website: { kind: "glyph", Component: Globe },
  Email: { kind: "glyph", Component: Mail },
  Phone: { kind: "glyph", Component: Phone },
  "Blog / RSS": { kind: "glyph", Component: Rss },
  Other: { kind: "glyph", Component: AtSign },
};

export const SOCIAL_ICON_NAMES = Object.keys(SOCIAL_ICONS);

/** Platforms that carry a real brand mark — shown first in the picker. */
export const BRAND_PLATFORMS = SOCIAL_ICON_NAMES.filter(
  (name) => SOCIAL_ICONS[name].kind === "brand",
);

export function SocialIcon({ name, className }: { name: string; className?: string }) {
  const def = SOCIAL_ICONS[name];

  if (def?.kind === "brand") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        role="img"
        aria-label={def.title}
      >
        <title>{def.title}</title>
        <path d={def.path} />
      </svg>
    );
  }

  const Glyph = def?.kind === "glyph" ? def.Component : Globe;
  return <Glyph className={className} aria-hidden />;
}
