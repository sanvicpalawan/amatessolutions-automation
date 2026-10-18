import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { navItems, socialLinks } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { SOCIAL_ICON_NAMES } from "@/lib/social";
import { ensureSiteDefaults } from "@/lib/site";

export const dynamic = "force-dynamic";

/** GET /api/admin/links — header/footer nav items + social links. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSiteDefaults();
  const [nav, social] = await Promise.all([
    db.select().from(navItems).orderBy(asc(navItems.sortOrder)),
    db.select().from(socialLinks).orderBy(asc(socialLinks.sortOrder)),
  ]);

  return Response.json({ nav, social });
}

/**
 * PUT /api/admin/links — full replace of both collections.
 * Body: { nav: [...], social: [...] }
 */
export async function PUT(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    nav?: Array<{ label: string; href: string; location: string; group?: string; enabled?: boolean }>;
    social?: Array<{ platform: string; url: string; icon: string; location: string; enabled?: boolean }>;
  };

  if (!Array.isArray(body.nav) || !Array.isArray(body.social)) {
    return Response.json({ error: "`nav` and `social` arrays are required" }, { status: 422 });
  }

  for (const item of body.nav) {
    if (!item.label?.trim() || !item.href?.trim()) {
      return Response.json({ error: "Every nav item needs a label and a link" }, { status: 422 });
    }
  }
  for (const item of body.social) {
    if (!item.platform?.trim() || !item.url?.trim()) {
      return Response.json({ error: "Every social link needs a platform and a URL" }, { status: 422 });
    }
    if (!SOCIAL_ICON_NAMES.includes(item.icon)) {
      return Response.json({ error: `Unknown icon "${item.icon}"` }, { status: 422 });
    }
  }

  await db.delete(navItems);
  await db.delete(socialLinks);

  if (body.nav.length > 0) {
    await db.insert(navItems).values(
      body.nav.map((item, index) => ({
        label: item.label.trim().slice(0, 60),
        href: item.href.trim().slice(0, 200),
        location: ["header", "footer"].includes(item.location) ? item.location : "header",
        group: (item.group ?? "main").slice(0, 40),
        sortOrder: index + 1,
        enabled: item.enabled !== false,
      })),
    );
  }

  if (body.social.length > 0) {
    await db.insert(socialLinks).values(
      body.social.map((item, index) => ({
        platform: item.platform.trim().slice(0, 60),
        url: item.url.trim().slice(0, 300),
        icon: item.icon,
        location: ["header", "footer"].includes(item.location) ? item.location : "header",
        sortOrder: index + 1,
        enabled: item.enabled !== false,
      })),
    );
  }

  return Response.json({ ok: true, navCount: body.nav.length, socialCount: body.social.length });
}
