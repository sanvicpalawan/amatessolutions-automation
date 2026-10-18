import { eq } from "drizzle-orm";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { SETTINGS_KEYS } from "@/lib/settings";
import { DEFAULT_THEME, FONT_OPTIONS, type SiteTheme } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SETTINGS_KEYS.theme))
    .limit(1);

  const stored = (rows[0]?.value ?? {}) as Partial<SiteTheme>;
  return Response.json({
    theme: {
      ...DEFAULT_THEME,
      ...stored,
      colors: { ...DEFAULT_THEME.colors, ...stored.colors },
    },
  });
}

export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { theme?: Partial<SiteTheme> };
  if (!body.theme) return Response.json({ error: "`theme` object is required" }, { status: 422 });

  const theme: SiteTheme = {
    ...DEFAULT_THEME,
    ...body.theme,
    colors: { ...DEFAULT_THEME.colors, ...body.theme.colors },
  };

  // Fonts are constrained to the curated list so we never inject arbitrary CSS.
  const allowed = FONT_OPTIONS as readonly string[];
  if (!allowed.includes(theme.bodyFont)) theme.bodyFont = DEFAULT_THEME.bodyFont;
  if (!allowed.includes(theme.headingFont)) theme.headingFont = DEFAULT_THEME.headingFont;

  // Colours must be hex so they can be safely embedded in a style tag.
  for (const [key, value] of Object.entries(theme.colors)) {
    if (!/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      theme.colors[key as keyof SiteTheme["colors"]] =
        DEFAULT_THEME.colors[key as keyof SiteTheme["colors"]];
    }
  }

  if (!/^[\w\s.-]{0,24}$/.test(theme.radius)) theme.radius = DEFAULT_THEME.radius;

  await db
    .insert(settings)
    .values({ key: SETTINGS_KEYS.theme, value: theme, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: theme, updatedAt: new Date() },
    });

  return Response.json({ ok: true, theme });
}
