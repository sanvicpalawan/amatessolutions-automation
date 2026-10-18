/**
 * Client-safe site model: theme defaults, editable content defaults and the
 * metadata the admin editor needs. NO database imports, so this module is safe
 * to import from client components. Server-only loaders live in `./site.ts`.
 */

import { MEDIA, SUB_CITIES } from "@/lib/media";

/* ------------------------------------------------------------------ *
 * Theme
 * ------------------------------------------------------------------ */

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  navy: string;
  navyDeep: string;
  navyMid: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
};

export type SiteTheme = {
  bodyFont: string;
  headingFont: string;
  colors: ThemeColors;
  radius: string;
};

export const DEFAULT_THEME: SiteTheme = {
  bodyFont: "Inter",
  headingFont: "Inter",
  colors: {
    primary: "#f59e0b",
    primaryDark: "#b45309",
    primaryLight: "#fccf4d",
    navy: "#0b1626",
    navyDeep: "#060d1a",
    navyMid: "#1b3048",
    surface: "#ffffff",
    surfaceMuted: "#f8fafc",
    text: "#0b1626",
    textMuted: "#475569",
  },
  radius: "1rem",
};

/** Curated Google Fonts the owner can pick from (loaded at runtime, not build). */
export const FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Roboto",
  "Open Sans",
  "Lato",
  "Nunito",
  "Raleway",
  "Work Sans",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Archivo",
  "Outfit",
  "Sora",
  "Figtree",
  "Barlow",
] as const;

export const COLOR_FIELDS: Array<{ key: keyof ThemeColors; label: string; hint: string }> = [
  { key: "primary", label: "Primary (solar)", hint: "Buttons, accents, highlights" },
  { key: "primaryLight", label: "Primary light", hint: "Gradient top, soft accents" },
  { key: "primaryDark", label: "Primary dark", hint: "Hover states, deep accents" },
  { key: "navy", label: "Navy", hint: "Body text, dark sections" },
  { key: "navyDeep", label: "Navy deep", hint: "Hero + footer backgrounds" },
  { key: "navyMid", label: "Navy mid", hint: "Cards on dark, borders" },
  { key: "surface", label: "Surface", hint: "Card / page background" },
  { key: "surfaceMuted", label: "Surface muted", hint: "Alternating sections" },
  { key: "text", label: "Text", hint: "Primary copy" },
  { key: "textMuted", label: "Text muted", hint: "Secondary copy" },
];

/* ------------------------------------------------------------------ *
 * Editable content
 * ------------------------------------------------------------------ */

export type HeroStat = { k: string; v: string };
export type ReviewSpec = { label: string; value: string };
export type Reason = { title: string; body: string; icon: string };

export type SiteContent = {
  siteName: string;
  siteTagline: string;

  heroEyebrow: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroImage: string;
  heroSubCities: string[];
  heroStats: HeroStat[];

  whyEyebrow: string;
  whyTitle1: string;
  whyTitle2: string;
  whyBody: string;
  whyHeading: string;
  whyReasons: Reason[];
  whyImage: string;
  whyCta: string;
  whyBadgeTitle: string;
  whyBadgeBody: string;

  processEyebrow: string;
  processTitle: string;
  processBody: string;
  processNote: string;
  processNoteCta: string;
  processBgImage: string;

  servicesEyebrow: string;
  servicesTitle: string;
  servicesBody: string;
  servicesImages: Record<string, string>;
  servicesPageEyebrow: string;
  servicesPageTitle: string;
  servicesPageSubtitle: string;
  servicesPageImage: string;
  servicesDetailTitle: string;
  trustHeadingLine1: string;
  trustHeadingLine2: string;
  trustBody1: string;
  trustBody2: string;
  trustCta: string;
  trustImage: string;

  reviewEyebrow: string;
  reviewTitle: string;
  reviewSubtitle: string;
  reviewBadge: string;
  reviewSiteName: string;
  reviewMeta: string;
  reviewQuote1: string;
  reviewQuote2: string;
  reviewAuthor: string;
  reviewAuthorMeta: string;
  reviewImage: string;
  reviewSpecs: ReviewSpec[];

  quoteEyebrow: string;
  quoteTitle: string;
  quoteBody: string;
  quotePerks: string[];
  quoteNote: string;
  quoteCta: string;

  blogEyebrow: string;
  blogTitle: string;
  blogBody: string;

  footerAbout: string;
  footerEmail: string;
  footerWhatsapp: string;
  footerAddress: string;
  footerCopyright: string;
  footerTermsHeading: string;
};

export const DEFAULT_CONTENT: SiteContent = {
  siteName: "Amates Solutions",
  siteTagline: "Reliable energy. Smart choice.",

  heroEyebrow: "Palawan · Philippines",
  heroTitleLine1: "High-Resilience",
  heroTitleLine2: "Solar Hybrid Systems",
  heroSubtitle:
    "Uninterrupted power solutions for your business or personal needs across Palawan — engineered marine-grade, installed by our own crews, and backed by free lifetime remote monitoring.",
  heroCtaPrimary: "Get a Free Quote",
  heroCtaSecondary: "See our 4-step process",
  heroImage: MEDIA.heroPanels,
  heroSubCities: [...SUB_CITIES],
  heroStats: [
    { k: "25 yr", v: "Panel warranty" },
    { k: "24/7", v: "Remote monitoring" },
    { k: "Marine", v: "Grade hardware" },
    { k: "Free", v: "Lifetime monitoring*" },
  ],

  whyEyebrow: "The problem",
  whyTitle1: "When the grid fails,",
  whyTitle2: "your system takes over",
  whyBody:
    "In the Philippines, grid instability isn't an inconvenience — it's a direct threat to your operations. Consumer-grade kits fail under island conditions: salt air, 35°C heat, voltage sag and typhoon loading. Amates Solutions delivers industrial-grade systems engineered for high-demand environments.",
  whyHeading: "Why Amates?",
  whyReasons: [
    {
      title: "Active Remote Monitoring",
      body: "Our desk watches every Amates system 24/7. We often see a fault before you do and dispatch before production drops.",
      icon: "Activity",
    },
    {
      title: "Accelerated Return on Investment",
      body: "Systems are sized against your real load profile and the true cost of diesel — not a catalogue guess.",
      icon: "TrendingUp",
    },
    {
      title: "Long-Term Partnership",
      body: "Maintenance, cleaning, diagnostics and expansion as your load grows. We stay on the island with you.",
      icon: "HeartHandshake",
    },
    {
      title: "Technical Guarantees",
      body: "25-year panel performance warranty, documented commissioning, and a troubleshooting manual handed over at activation.",
      icon: "ShieldCheck",
    },
  ],
  whyImage: MEDIA.rooftopCloseUp,
  whyCta: "Get a Free Quote",
  whyBadgeTitle: "Fleet online",
  whyBadgeBody: "Live telemetry streaming from Amates sites across Palawan.",

  processEyebrow: "Our framework",
  processTitle: "We keep it simple",
  processBody:
    "Switching to solar should be transparent and efficient. We use a four-step framework to move your property from grid-dependence to total energy autonomy.",
  processNote:
    "Free lifetime remote monitoring is available on systems we install, requires a functional WIFI connection at the site, allows no modifications except by Amates Solutions, and is subject to the lifespan of the appliances and the software provided by the appliance manufacturer.",
  processNoteCta: "Book my energy audit",
  processBgImage: MEDIA.installCrew,

  servicesEyebrow: "Verticals",
  servicesTitle: "Solutions for your current and future needs",
  servicesBody:
    "Residential, commercial, industrial & marine, plus maintenance and 24/7 monitoring — delivered across the Palawan archipelago.",
  servicesImages: {
    residential: MEDIA.residentialHome,
    commercial: MEDIA.elNidoAerial,
    industrial_marine: MEDIA.bangkaBoat,
    maintenance: MEDIA.installCrew,
  },
  servicesPageEyebrow: "What we do",
  servicesPageTitle: "Services",
  servicesPageSubtitle:
    "Whether you're powering your home or scaling operations for your business, we design and install solar systems built for long-term performance.",
  servicesPageImage: MEDIA.heroPanels,
  servicesDetailTitle: "Everything we install, service and monitor",
  trustHeadingLine1: "We install only the systems",
  trustHeadingLine2: "we use ourselves",
  trustBody1:
    "Tried and tested, Deye and Jinko are proven brands and we are pleased to provide systems which offer the best value to performance ratio. These systems we use for all our other personal and business projects and have been very pleased with their performance.",
  trustBody2:
    "Contact us directly to get 24/7 reliable solar power that brings your bills down to 0 or for a huge saving.",
  trustCta: "Get a Free Quote",
  trustImage: MEDIA.installCrew,

  reviewEyebrow: "Project review",
  reviewTitle: "Island Resort, Linapacan",
  reviewSubtitle: "A successful remote island install.",
  reviewBadge: "7.3 KW · Off-grid",
  reviewSiteName: "Island Resort — Off-grid typhoon repair",
  reviewMeta: "Linapacan, Palawan",
  reviewQuote1:
    "Our system was damaged from typhoon Tino, the guys were ready and didn't waste time to provide us with quick solutions to get the system back up. They got everything working again in just two days!",
  reviewQuote2:
    "It was so important for our business to have power on the island. The diesel for the generator was costing too much. I'm so grateful. Salamat!",
  reviewAuthor: "— Ruby W.",
  reviewAuthorMeta: "Island Resort, Linapacan",
  reviewImage: MEDIA.coronIsland,
  reviewSpecs: [
    { label: "System size", value: "7.3 kWp hybrid" },
    { label: "Location", value: "Linapacan, Palawan" },
    { label: "Scope", value: "Off-grid typhoon repair" },
    { label: "Turnaround", value: "2 days on site" },
  ],

  quoteEyebrow: "Free assessment",
  quoteTitle: "Request your free solar assessment",
  quoteBody:
    "Tell us about your property and energy usage. The more detail you give, the sharper the quote. Our team reviews every submission, contacts you by WhatsApp and email, and sends a personalised solar proposal — free of charge and with no obligation.",
  quotePerks: [
    "Load-profile based sizing, not catalogue guesswork",
    "ROI and payback modelled on Palawan tariffs & diesel cost",
    "Marine-grade specification on every design",
    "Free lifetime remote monitoring on Amates installs*",
  ],
  quoteNote:
    "*Requires functional WIFI at site. No modifications except by Amates Solutions. Subject to the lifespan of the appliances and manufacturer software. Prefer chat? Message us on WhatsApp — inbound messages land in the same intake pipeline.",
  quoteCta: "Get my free quote",

  blogEyebrow: "Insights",
  blogTitle: "From the Palawan energy desk",
  blogBody:
    "Practical notes on island power, marine-grade hardware, typhoon resilience and the economics of going solar in Palawan.",

  footerAbout:
    "Reliable energy. Smart choice. High-resilience solar hybrid systems designed, installed and monitored across Palawan, Philippines.",
  footerEmail: "hello@amatessolutions.com",
  footerWhatsapp: "",
  footerAddress: "Palawan, Philippines",
  footerCopyright: "© {year} Amates Solutions. All rights reserved.",
  footerTermsHeading: "Warranty & monitoring terms",
};

export const CONTENT_KEYS = Object.keys(DEFAULT_CONTENT) as Array<keyof SiteContent>;

/** Section metadata so the editor can group fields sensibly. */
export const CONTENT_GROUPS: Array<{ id: string; label: string; keys: Array<keyof SiteContent> }> = [
  {
    id: "brand",
    label: "Brand & identity",
    keys: ["siteName", "siteTagline"],
  },
  {
    id: "hero",
    label: "Hero",
    keys: [
      "heroEyebrow",
      "heroTitleLine1",
      "heroTitleLine2",
      "heroSubtitle",
      "heroCtaPrimary",
      "heroCtaSecondary",
    ],
  },
  {
    id: "why",
    label: "Why Amates",
    keys: [
      "whyEyebrow",
      "whyTitle1",
      "whyTitle2",
      "whyBody",
      "whyHeading",
      "whyCta",
      "whyBadgeTitle",
      "whyBadgeBody",
    ],
  },
  {
    id: "process",
    label: "4-step framework",
    keys: ["processEyebrow", "processTitle", "processBody", "processNote", "processNoteCta"],
  },
  {
    id: "services",
    label: "Services page",
    keys: [
      "servicesEyebrow",
      "servicesTitle",
      "servicesBody",
      "servicesPageEyebrow",
      "servicesPageTitle",
      "servicesPageSubtitle",
      "servicesDetailTitle",
      "trustHeadingLine1",
      "trustHeadingLine2",
      "trustBody1",
      "trustBody2",
      "trustCta",
    ],
  },
  {
    id: "review",
    label: "Project review",
    keys: [
      "reviewEyebrow",
      "reviewTitle",
      "reviewSubtitle",
      "reviewBadge",
      "reviewSiteName",
      "reviewMeta",
      "reviewQuote1",
      "reviewQuote2",
      "reviewAuthor",
      "reviewAuthorMeta",
    ],
  },
  {
    id: "quote",
    label: "Quote form",
    keys: ["quoteEyebrow", "quoteTitle", "quoteBody", "quoteNote", "quoteCta"],
  },
  {
    id: "blog",
    label: "Blog",
    keys: ["blogEyebrow", "blogTitle", "blogBody"],
  },
  {
    id: "footer",
    label: "Footer",
    keys: [
      "footerAbout",
      "footerEmail",
      "footerWhatsapp",
      "footerAddress",
      "footerCopyright",
      "footerTermsHeading",
    ],
  },
];

const LIST_KEYS: Array<keyof SiteContent> = [
  "heroSubCities",
  "quotePerks",
];
const HERO_STATS_KEY: keyof SiteContent = "heroStats";
const REASONS_KEY: keyof SiteContent = "whyReasons";
const SPECS_KEY: keyof SiteContent = "reviewSpecs";

export function isLongText(key: keyof SiteContent): boolean {
  return [
    "heroSubtitle",
    "whyBody",
    "processBody",
    "processNote",
    "servicesBody",
    "reviewQuote1",
    "reviewQuote2",
    "quoteBody",
    "quoteNote",
    "blogBody",
    "footerAbout",
  ].includes(key);
}

/** Resolves a stored image reference (remote URL or /api/media/[id]) to a src. */
export function mediaSrc(reference: string | null | undefined): string {
  if (!reference) return "";
  if (reference.startsWith("/api/media/") || reference.startsWith("http")) return reference;
  if (/^\d+$/.test(reference)) return `/api/media/${reference}`;
  return reference;
}
