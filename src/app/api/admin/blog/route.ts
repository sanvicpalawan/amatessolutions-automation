import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

function serialize(row: typeof blogPosts.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    coverMediaId: row.coverMediaId,
    category: row.category,
    tags: (row.tags as string[]) ?? [],
    author: row.author,
    status: row.status,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    featured: row.featured,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** GET /api/admin/blog — every post, drafts included. */
export async function GET() {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt));
  return Response.json({ posts: rows.map(serialize) });
}

type Body = {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverMediaId?: number | null;
  category?: string;
  tags?: string[];
  author?: string;
  status?: string;
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
};

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === "string").slice(0, 12);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
}

/** POST /api/admin/blog — create a post. */
export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Body;
  if (!body.title?.trim()) {
    return Response.json({ error: "A title is required" }, { status: 422 });
  }

  const slug = slugify(body.slug?.trim() || body.title);
  const existing = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    return Response.json({ error: "That URL slug is already in use" }, { status: 409 });
  }

  const status = body.status === "published" ? "published" : "draft";

  const [row] = await db
    .insert(blogPosts)
    .values({
      slug,
      title: body.title.trim().slice(0, 180),
      excerpt: (body.excerpt ?? "").slice(0, 400),
      content: body.content ?? "",
      coverMediaId: body.coverMediaId ?? null,
      category: (body.category ?? "Insights").slice(0, 60),
      tags: parseTags(body.tags),
      author: (body.author ?? "Amates Solutions").slice(0, 80),
      status,
      seoTitle: (body.seoTitle ?? "").slice(0, 180),
      seoDescription: (body.seoDescription ?? "").slice(0, 320),
      featured: body.featured === true,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning();

  return Response.json({ ok: true, post: serialize(row) }, { status: 201 });
}
