import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { mediaAssets, navItems, settings, socialLinks } from "@/db/schema";
import { SETTINGS_KEYS } from "@/lib/settings";
import {
  CONTENT_KEYS,
  DEFAULT_CONTENT,
  DEFAULT_THEME,
  type SiteContent,
  type SiteTheme,
} from "@/lib/site-model";
import { MEDIA } from "@/lib/media";

export { CONTENT_KEYS, COLOR_FIELDS, mediaSrc,
  CONTENT_GROUPS,
  DEFAULT_CONTENT,
  DEFAULT_THEME,
  FONT_OPTIONS,
  isLongText,
  type HeroStat,
  type Reason,
  type ReviewSpec,
  type SiteContent,
  type SiteTheme,
} from "@/lib/site-model";

/* ------------------------------------------------------------------ *
 * Loader
 * ------------------------------------------------------------------ */

async function readJsonSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const rows = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    if (!rows[0]) return fallback;
    return { ...fallback, ...(rows[0].value as object) } as T;
  } catch {
    return fallback;
  }
}

export async function loadTheme(): Promise<SiteTheme> {
  const stored = await readJsonSetting<SiteTheme>(SETTINGS_KEYS.theme, DEFAULT_THEME);
  return { ...DEFAULT_THEME, ...stored, colors: { ...DEFAULT_THEME.colors, ...stored.colors } };
}

export async function loadContent(): Promise<SiteContent> {
  const stored = await readJsonSetting<SiteContent>(SETTINGS_KEYS.siteContent, DEFAULT_CONTENT);
  return { ...DEFAULT_CONTENT, ...stored };
}

export async function loadNavItems(location?: string) {
  const rows = await db.select().from(navItems).orderBy(asc(navItems.sortOrder));
  return location ? rows.filter((row) => row.location === location) : rows;
}

export async function loadSocialLinks(location?: string) {
  const rows = await db.select().from(socialLinks).orderBy(asc(socialLinks.sortOrder));
  return location ? rows.filter((row) => row.location === location) : rows;
}

/** Seeds default nav, social links and stock media so the site is never empty. */
export async function ensureSiteDefaults(): Promise<void> {
  const [navCount, socialCount, mediaCount] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(navItems),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(socialLinks),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(mediaAssets),
  ]);

  if (navCount[0]?.count === 0) {
    await db.insert(navItems).values([
      { label: "Why Amates", href: "/#why", location: "header", group: "main", sortOrder: 1 },
      { label: "Process", href: "/#process", location: "header", group: "main", sortOrder: 2 },
      { label: "Services", href: "/services", location: "header", group: "main", sortOrder: 3 },
      { label: "Project Review", href: "/#review", location: "header", group: "main", sortOrder: 4 },
      { label: "Blog", href: "/blog", location: "header", group: "main", sortOrder: 5 },
      { label: "Contact", href: "/#quote", location: "header", group: "main", sortOrder: 6 },
      { label: "Residential solar", href: "/services", location: "footer", group: "Services", sortOrder: 1 },
      { label: "Commercial solar", href: "/services", location: "footer", group: "Services", sortOrder: 2 },
      { label: "Industrial & marine", href: "/services", location: "footer", group: "Services", sortOrder: 3 },
      { label: "Maintenance & 24/7 monitoring", href: "/services", location: "footer", group: "Services", sortOrder: 4 },
      { label: "Blog", href: "/blog", location: "footer", group: "Company", sortOrder: 1 },
      { label: "Admin backoffice", href: "/admin", location: "footer", group: "Company", sortOrder: 2 },
    ]);
  }

  if (socialCount[0]?.count === 0) {
    await db.insert(socialLinks).values([
      { platform: "Instagram", url: "https://instagram.com/amatessolutions", icon: "Instagram", location: "header", sortOrder: 1 },
      { platform: "Facebook", url: "https://facebook.com/amatessolutions", icon: "Facebook", location: "header", sortOrder: 2 },
      { platform: "GitHub", url: "https://github.com/amatessolutions", icon: "GitHub", location: "header", sortOrder: 3 },
      { platform: "WhatsApp", url: "https://wa.me/639171234567", icon: "WhatsApp", location: "footer", sortOrder: 1 },
      { platform: "YouTube", url: "https://youtube.com/@amatessolutions", icon: "YouTube", location: "footer", sortOrder: 2 },
      { platform: "TikTok", url: "https://tiktok.com/@amatessolutions", icon: "TikTok", location: "footer", sortOrder: 3 },
    ]);
  }

  if (mediaCount[0]?.count === 0) {
    await db.insert(mediaAssets).values(
      Object.entries({
        "Solar array (hero)": MEDIA.heroPanels,
        "Rooftop close-up": MEDIA.rooftopCloseUp,
        "Install crew": MEDIA.installCrew,
        "Residential home": MEDIA.residentialHome,
        "El Nido aerial": MEDIA.elNidoAerial,
        "Coron island": MEDIA.coronIsland,
        "Bangka boat": MEDIA.bangkaBoat,
      }).map(([name, url], index) => ({
        name,
        alt: name,
        url,
        folder: "stock",
        size: 0,
      })),
    );
  }
}
