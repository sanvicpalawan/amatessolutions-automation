"use client";

import { useEffect, useMemo, useState } from "react";

import MediaLibrary from "@/components/admin/MediaLibrary";
import { Icon } from "@/lib/icons";
import { REASON_ICON_CHOICES } from "@/lib/icon-names";
import { BRAND_PLATFORMS, SocialIcon, SOCIAL_ICON_NAMES } from "@/lib/social";
import {
  COLOR_FIELDS,
  CONTENT_GROUPS,
  FONT_OPTIONS,
  isLongText,
  mediaSrc,
  type SiteContent,
  type SiteTheme,
} from "@/lib/site-model";

type NavRow = { label: string; href: string; location: string; group: string; enabled: boolean };
type SocialRow = { platform: string; url: string; icon: string; location: string; enabled: boolean };

const TABS = [
  { id: "theme", label: "Theme & fonts" },
  { id: "content", label: "Text & headings" },
  { id: "images", label: "Images" },
  { id: "lists", label: "Lists & stats" },
  { id: "nav", label: "Header & footer" },
  { id: "social", label: "Social links" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-solar-400 focus:ring-4 focus:ring-solar-400/15";

const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800";

function Field({
  label,
  value,
  onChange,
  long = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  long?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {long ? (
        <textarea
          rows={3}
          className={inputClass}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

export default function SiteEditor({
  initialContent,
  initialTheme,
  initialNav,
  initialSocial,
}: {
  initialContent: SiteContent;
  initialTheme: SiteTheme;
  initialNav: NavRow[];
  initialSocial: SocialRow[];
}) {
  const [tab, setTab] = useState<TabId>("theme");
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [theme, setTheme] = useState<SiteTheme>(initialTheme);
  const [nav, setNav] = useState<NavRow[]>(initialNav);
  const [social, setSocial] = useState<SocialRow[]>(initialSocial);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  function setField<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  async function saveContent() {
    setSaving(true);
    setNote("");
    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setNote(response.ok ? "Site content saved." : "Could not save content.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTheme() {
    setSaving(true);
    setNote("");
    try {
      const response = await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      setNote(response.ok ? "Theme saved. Reload the site to see the new fonts and colours." : "Could not save theme.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLinks() {
    setSaving(true);
    setNote("");
    try {
      const response = await fetch("/api/admin/links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nav, social }),
      });
      setNote(
        response.ok
          ? `Saved ${nav.length} nav items and ${social.length} social links.`
          : "Could not save links.",
      );
    } finally {
      setSaving(false);
    }
  }

  const groupedNav = useMemo(() => {
    const groups = new Map<string, NavRow[]>();
    nav.forEach((item) => {
      const key = `${item.location}::${item.group}`;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    });
    return Array.from(groups.entries());
  }, [nav]);

  const saveButton = (
    <button
      type="button"
      disabled={saving}
      onClick={() => {
        if (tab === "theme") void saveTheme();
        else if (tab === "nav" || tab === "social") void saveLinks();
        else void saveContent();
      }}
      className="rounded-full bg-navy-900 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950 disabled:opacity-60"
    >
      {saving ? "Saving…" : "Save changes"}
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition ${
              tab === item.id
                ? "bg-navy-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="ml-auto">{saveButton}</div>
      </div>

      {note ? (
        <p className="mt-4 rounded-xl bg-solar-50 px-4 py-3 text-xs font-medium text-navy-800">{note}</p>
      ) : null}

      {/* ---------------- Theme ---------------- */}
      {tab === "theme" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Fonts</h2>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className={labelClass}>Body font</span>
                <select
                  className={inputClass}
                  value={theme.bodyFont}
                  onChange={(event) => setTheme({ ...theme, bodyFont: event.target.value })}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Heading font</span>
                <select
                  className={inputClass}
                  value={theme.headingFont}
                  onChange={(event) => setTheme({ ...theme, headingFont: event.target.value })}
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Corner radius</span>
                <select
                  className={inputClass}
                  value={theme.radius}
                  onChange={(event) => setTheme({ ...theme, radius: event.target.value })}
                >
                  {["0rem", "0.375rem", "0.75rem", "1rem", "1.5rem", "2rem"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              Fonts are loaded at runtime from Google Fonts, so changing them never triggers a
              rebuild. If a font cannot load, the browser falls back to a metric-compatible system
              face.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Colour palette</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {COLOR_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label={field.label}
                    value={theme.colors[field.key]}
                    onChange={(event) =>
                      setTheme({
                        ...theme,
                        colors: { ...theme.colors, [field.key]: event.target.value },
                      })
                    }
                    className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-slate-300"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-navy-900">{field.label}</p>
                    <p className="truncate text-[11px] text-slate-400">{theme.colors[field.key]}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: "Primary", className: "bg-solar-500" },
                { label: "Light", className: "bg-solar-300" },
                { label: "Navy", className: "bg-navy-900" },
                { label: "Deep", className: "bg-navy-950" },
                { label: "Muted", className: "bg-slate-100" },
              ].map((chip) => (
                <span key={chip.label} className="flex items-center gap-1.5">
                  <span className={`h-5 w-5 rounded ${chip.className}`} />
                  <span className="text-[11px] uppercase tracking-wider text-slate-500">
                    {chip.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- Text ---------------- */}
      {tab === "content" ? (
        <div className="mt-6 space-y-6">
          {CONTENT_GROUPS.map((group) => (
            <div key={group.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                {group.label}
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {group.keys.map((key) => (
                  <div key={String(key)} className={isLongText(key) ? "md:col-span-2" : ""}>
                    <Field
                      label={String(key).replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
                      value={String(content[key] ?? "")}
                      long={isLongText(key)}
                      onChange={(value) => setField(key, value as SiteContent[typeof key])}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ---------------- Images ---------------- */}
      {tab === "images" ? (
        <div className="mt-6 space-y-6">
          <MediaLibrary onPick={() => undefined} />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Section images
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Upload an image and it is copied into every image field below — each field keeps its
              own value. Leave a field empty to fall back to the built-in stock photo.
            </p>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {[
                { key: "heroImage", label: "Hero background" },
                { key: "whyImage", label: "Why Amates photo" },
                { key: "processBgImage", label: "4-step background" },
                { key: "reviewImage", label: "Project review photo" },
                { key: "servicesPageImage", label: "Services page hero" },
                { key: "trustImage", label: "“We install only…” photo" },
              ].map((item) => (
                <div key={item.key} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={labelClass}>{item.label}</span>
                    <MediaLibrary
                      compact
                      onPick={(reference) =>
                        setField(item.key as keyof SiteContent, reference as never)
                      }
                    />
                  </div>
                  <div className="mt-3 h-32 overflow-hidden rounded-lg bg-slate-100">
                    {content[item.key as keyof SiteContent] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaSrc(String(content[item.key as keyof SiteContent]))}
                        alt={item.label}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-wider text-slate-400">
                        Using default
                      </div>
                    )}
                  </div>
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px]"
                    placeholder="Media id, /api/media/12, or https://…"
                    value={String(content[item.key as keyof SiteContent] ?? "")}
                    onChange={(event) =>
                      setField(item.key as keyof SiteContent, event.target.value as never)
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Vertical cards
            </h2>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              {Object.entries(content.servicesImages).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={labelClass}>{key.replaceAll("_", " ")}</span>
                    <MediaLibrary
                      compact
                      onPick={(reference) =>
                        setContent((prev) => ({
                          ...prev,
                          servicesImages: { ...prev.servicesImages, [key]: reference },
                        }))
                      }
                    />
                  </div>
                  <div className="mt-3 h-28 overflow-hidden rounded-lg bg-slate-100">
                    {value ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaSrc(value)} alt={key} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-[11px]"
                    value={value}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        servicesImages: { ...prev.servicesImages, [key]: event.target.value },
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- Lists ---------------- */}
      {tab === "lists" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Hero stats</h2>
              <button
                type="button"
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    heroStats: [...prev.heroStats, { k: "New", v: "Statistic" }],
                  }))
                }
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
              >
                + Add
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {content.heroStats.map((stat, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    className="w-24 rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-bold"
                    value={stat.k}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        heroStats: prev.heroStats.map((s, i) =>
                          i === index ? { ...s, k: event.target.value } : s,
                        ),
                      }))
                    }
                  />
                  <input
                    className="flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    value={stat.v}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        heroStats: prev.heroStats.map((s, i) =>
                          i === index ? { ...s, v: event.target.value } : s,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setContent((prev) => ({
                        ...prev,
                        heroStats: prev.heroStats.filter((_, i) => i !== index),
                      }))
                    }
                    className="text-xs font-bold text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                Hero sub-cities
              </h2>
              <button
                type="button"
                onClick={() =>
                  setContent((prev) => ({ ...prev, heroSubCities: [...prev.heroSubCities, ""] }))
                }
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
              >
                + Add
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {content.heroSubCities.map((city, index) => (
                <span key={index} className="flex items-center gap-1">
                  <input
                    className="w-36 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
                    value={city}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        heroSubCities: prev.heroSubCities.map((c, i) =>
                          i === index ? event.target.value : c,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setContent((prev) => ({
                        ...prev,
                        heroSubCities: prev.heroSubCities.filter((_, i) => i !== index),
                      }))
                    }
                    className="text-xs font-bold text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                Quote perks
              </h2>
              <button
                type="button"
                onClick={() =>
                  setContent((prev) => ({ ...prev, quotePerks: [...prev.quotePerks, ""] }))
                }
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
              >
                + Add
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {content.quotePerks.map((perk, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    value={perk}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        quotePerks: prev.quotePerks.map((p, i) =>
                          i === index ? event.target.value : p,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setContent((prev) => ({
                        ...prev,
                        quotePerks: prev.quotePerks.filter((_, i) => i !== index),
                      }))
                    }
                    className="text-xs font-bold text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                Why Amates cards
              </h2>
              <button
                type="button"
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    whyReasons: [...prev.whyReasons, { title: "New reason", body: "", icon: "ShieldCheck" }],
                  }))
                }
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
              >
                + Add
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {content.whyReasons.map((reason, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-solar-400 to-solar-600 text-navy-950">
                      <Icon name={reason.icon} className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                    <input
                      className="flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-sm font-bold"
                      value={reason.title}
                      onChange={(event) =>
                        setContent((prev) => ({
                          ...prev,
                          whyReasons: prev.whyReasons.map((r, i) =>
                            i === index ? { ...r, title: event.target.value } : r,
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setContent((prev) => ({
                          ...prev,
                          whyReasons: prev.whyReasons.filter((_, i) => i !== index),
                        }))
                      }
                      className="text-xs font-bold text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    value={reason.body}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        whyReasons: prev.whyReasons.map((r, i) =>
                          i === index ? { ...r, body: event.target.value } : r,
                        ),
                      }))
                    }
                  />
                  <select
                    className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px]"
                    value={reason.icon}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        whyReasons: prev.whyReasons.map((r, i) =>
                          i === index ? { ...r, icon: event.target.value } : r,
                        ),
                      }))
                    }
                  >
                    {REASON_ICON_CHOICES.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                Project review specs
              </h2>
              <button
                type="button"
                onClick={() =>
                  setContent((prev) => ({
                    ...prev,
                    reviewSpecs: [...prev.reviewSpecs, { label: "New", value: "" }],
                  }))
                }
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
              >
                + Add
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {content.reviewSpecs.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    className="w-32 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    value={spec.label}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        reviewSpecs: prev.reviewSpecs.map((s, i) =>
                          i === index ? { ...s, label: event.target.value } : s,
                        ),
                      }))
                    }
                  />
                  <input
                    className="flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
                    value={spec.value}
                    onChange={(event) =>
                      setContent((prev) => ({
                        ...prev,
                        reviewSpecs: prev.reviewSpecs.map((s, i) =>
                          i === index ? { ...s, value: event.target.value } : s,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setContent((prev) => ({
                        ...prev,
                        reviewSpecs: prev.reviewSpecs.filter((_, i) => i !== index),
                      }))
                    }
                    className="text-xs font-bold text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- Nav ---------------- */}
      {tab === "nav" ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                  Navigation items
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Header links and footer link groups. Reorder by moving items, disable to hide.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setNav((prev) => [
                    ...prev,
                    { label: "New link", href: "/", location: "header", group: "main", enabled: true },
                  ])
                }
                className="rounded-full bg-solar-400 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-navy-950"
              >
                + Add item
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {groupedNav.map(([key, items]) => {
                const [location, group] = key.split("::");
                return (
                  <div key={key}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {location} · {group}
                    </p>
                    <div className="mt-2 space-y-2">
                      {items.map((item) => {
                        const index = nav.indexOf(item);
                        return (
                          <div key={`${key}-${index}`} className="flex flex-wrap items-center gap-2 [&>input]:flex-1 [&>input]:sm:flex-none">
                            <input
                              className="w-full min-w-0 rounded-lg border border-slate-300 px-2.5 py-2 text-sm sm:w-40"
                              value={item.label}
                              onChange={(event) =>
                                setNav((prev) =>
                                  prev.map((row, i) =>
                                    i === index ? { ...row, label: event.target.value } : row,
                                  ),
                                )
                              }
                            />
                            <input
                              className="w-full min-w-0 rounded-lg border border-slate-300 px-2.5 py-2 text-sm sm:w-48"
                              value={item.href}
                              onChange={(event) =>
                                setNav((prev) =>
                                  prev.map((row, i) =>
                                    i === index ? { ...row, href: event.target.value } : row,
                                  ),
                                )
                              }
                            />
                            <input
                              className="w-full min-w-0 rounded-lg border border-slate-200 px-2.5 py-2 text-xs sm:w-28"
                              value={item.group}
                              onChange={(event) =>
                                setNav((prev) =>
                                  prev.map((row, i) =>
                                    i === index ? { ...row, group: event.target.value } : row,
                                  ),
                                )
                              }
                            />
                            <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                              <input
                                type="checkbox"
                                checked={item.enabled}
                                onChange={(event) =>
                                  setNav((prev) =>
                                    prev.map((row, i) =>
                                      i === index ? { ...row, enabled: event.target.checked } : row,
                                    ),
                                  )
                                }
                              />
                              On
                            </label>
                            <span className="flex gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() =>
                                  setNav((prev) => {
                                    const next = [...prev];
                                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                    return next;
                                  })
                                }
                                className="rounded border border-slate-300 px-2 py-1 text-[11px] disabled:opacity-30"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                disabled={index === nav.length - 1}
                                onClick={() =>
                                  setNav((prev) => {
                                    const next = [...prev];
                                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                                    return next;
                                  })
                                }
                                className="rounded border border-slate-300 px-2 py-1 text-[11px] disabled:opacity-30"
                              >
                                ↓
                              </button>
                            </span>
                            <button
                              type="button"
                              onClick={() => setNav((prev) => prev.filter((_, i) => i !== index))}
                              className="text-xs font-bold text-red-500"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- Social ---------------- */}
      {tab === "social" ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
                Social media links
              </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Official brand marks (Simple Icons) render in the header and footer. LinkedIn,
                  email, phone and website use Lucide glyphs because those marks are not published
                  in the open icon sets.
                </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSocial((prev) => [
                  ...prev,
                  { platform: "Instagram", url: "https://", icon: "Instagram", location: "header", enabled: true },
                ])
              }
              className="rounded-full bg-solar-400 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-navy-950"
            >
              + Add link
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {social.map((item, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-navy-800">
                  <SocialIcon name={item.icon} className="h-4 w-4" />
                </span>
                <input
                  className="w-32 rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                  value={item.platform}
                  onChange={(event) =>
                    setSocial((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, platform: event.target.value } : row)),
                    )
                  }
                />
                <input
                  className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                  value={item.url}
                  onChange={(event) =>
                    setSocial((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, url: event.target.value } : row)),
                    )
                  }
                />
                <select
                  className="w-32 rounded-lg border border-slate-200 px-2 py-2 text-xs"
                  value={item.icon}
                  onChange={(event) =>
                    setSocial((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, icon: event.target.value } : row)),
                    )
                  }
                >
                  <optgroup label="Brand logos">
                    {BRAND_PLATFORMS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Generic">
                    {SOCIAL_ICON_NAMES.filter((icon) => !BRAND_PLATFORMS.includes(icon)).map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <select
                  className="w-24 rounded-lg border border-slate-200 px-2 py-2 text-xs"
                  value={item.location}
                  onChange={(event) =>
                    setSocial((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, location: event.target.value } : row)),
                    )
                  }
                >
                  <option value="header">Header</option>
                  <option value="footer">Footer</option>
                </select>
                <label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500">
                  <input
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(event) =>
                      setSocial((prev) =>
                        prev.map((row, i) => (i === index ? { ...row, enabled: event.target.checked } : row)),
                      )
                    }
                  />
                  On
                </label>
                <button
                  type="button"
                  onClick={() => setSocial((prev) => prev.filter((_, i) => i !== index))}
                  className="text-xs font-bold text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
