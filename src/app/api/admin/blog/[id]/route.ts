import { eq } from "drizzle-orm";

import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) return Response.json({ error: "Bad id" }, { status: 400 });

  const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ post: row });
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) return Response.json({ error: "Bad id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.title === "string" && body.title.trim()) {
    update.title = body.title.trim().slice(0, 180);
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    const nextSlug = slugify(body.slug);
    const clash = await db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, nextSlug))
      .limit(1);
    if (clash.length > 0 && clash[0].id !== postId) {
      return Response.json({ error: "That URL slug is already in use" }, { status: 409 });
    }
    update.slug = nextSlug;
  }
  if (typeof body.excerpt === "string") update.excerpt = body.excerpt.slice(0, 400);
  if (typeof body.content === "string") update.content = body.content;
  if (typeof body.category === "string") update.category = body.category.slice(0, 60);
  if (typeof body.author === "string") update.author = body.author.slice(0, 80);
  if (typeof body.seoTitle === "string") update.seoTitle = body.seoTitle.slice(0, 180);
  if (typeof body.seoDescription === "string") {
    update.seoDescription = body.seoDescription.slice(0, 320);
  }
  if (body.tags !== undefined) {
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t): t is string => typeof t === "string").slice(0, 12)
      : [];
    update.tags = tags;
  }
  if (body.coverMediaId !== undefined) {
    update.coverMediaId = body.coverMediaId ? Number(body.coverMediaId) : null;
  }
  if (typeof body.featured === "boolean") update.featured = body.featured;

  if (typeof body.status === "string" && ["draft", "published"].includes(body.status)) {
    const [current] = await db
      .select({ publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(eq(blogPosts.id, postId))
      .limit(1);
    update.status = body.status;
    if (body.status === "published" && !current?.publishedAt) {
      update.publishedAt = new Date();
    }
  }

  const [row] = await db
    .update(blogPosts)
    .set(update)
    .where(eq(blogPosts.id, postId))
    .returning();

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true, post: row });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUser();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) return Response.json({ error: "Bad id" }, { status: 400 });

  await db.delete(blogPosts).where(eq(blogPosts.id, postId));
  return Response.json({ ok: true });
}
