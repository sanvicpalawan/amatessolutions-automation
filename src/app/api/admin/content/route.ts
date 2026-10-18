import { eq } from "drizzle-orm";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { SETTINGS_KEYS } from "@/lib/settings";
import { CONTENT_KEYS, DEFAULT_CONTENT, type SiteContent } from "@/lib/site";

export const dynamic = "force-dynamic";

/** GET /api/admin/content — full editable content document. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SETTINGS_KEYS.siteContent))
    .limit(1);

  const stored = (rows[0]?.value ?? {}) as Partial<SiteContent>;
  const content: SiteContent = { ...DEFAULT_CONTENT };
  const target = content as Record<string, unknown>;
  for (const key of CONTENT_KEYS) {
    const value = (stored as Record<string, unknown>)[key];
    if (value !== undefined && value !== null) target[key] = value;
  }

  return Response.json({ content });
}

/** PUT /api/admin/content — replace the whole content document. */
export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { content?: Partial<SiteContent> };
  if (!body.content || typeof body.content !== "object") {
    return Response.json({ error: "`content` object is required" }, { status: 422 });
  }

  // Merge onto stored values so a partial update never wipes other sections.
  const existing = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, SETTINGS_KEYS.siteContent))
    .limit(1);
  const previous = (existing[0]?.value ?? {}) as Record<string, unknown>;

  const next: Record<string, unknown> = { ...previous };
  const incoming = body.content as Record<string, unknown>;
  for (const key of CONTENT_KEYS) {
    if (incoming[key] !== undefined) next[key] = incoming[key];
  }

  await db
    .insert(settings)
    .values({ key: SETTINGS_KEYS.siteContent, value: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: next, updatedAt: new Date() },
    });

  return Response.json({ ok: true, content: next });
}
