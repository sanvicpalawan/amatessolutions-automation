import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { blogPosts, mediaAssets } from "@/db/schema";

export type BlogCard = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  status: string;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  coverMediaId: number | null;
  coverSrc: string | null;
};

function toCard(row: typeof blogPosts.$inferSelect, coverUrl: string | null): BlogCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    tags: (row.tags as string[]) ?? [],
    author: row.author,
    status: row.status,
    featured: row.featured,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    coverMediaId: row.coverMediaId,
    coverSrc: coverUrl ?? (row.coverMediaId ? `/api/media/${row.coverMediaId}` : null),
  };
}

/** Public listing: published posts only, featured first, newest first. */
export async function listPublishedPosts(): Promise<BlogCard[]> {
  const rows = await db
    .select({
      post: blogPosts,
      coverUrl: mediaAssets.url,
    })
    .from(blogPosts)
    .leftJoin(mediaAssets, eq(blogPosts.coverMediaId, mediaAssets.id))
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.featured), desc(blogPosts.publishedAt));

  return rows.map(({ post, coverUrl }) => toCard(post, coverUrl));
}

/** Single post for the public route — returns null for drafts. */
export async function getPublishedPost(slug: string): Promise<BlogCard | null> {
  const rows = await db
    .select({ post: blogPosts, coverUrl: mediaAssets.url })
    .from(blogPosts)
    .leftJoin(mediaAssets, eq(blogPosts.coverMediaId, mediaAssets.id))
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);

  if (!rows[0]) return null;
  return toCard(rows[0].post, rows[0].coverUrl);
}

/** Related posts for the "keep reading" block. */
export async function relatedPosts(slug: string, category: string, limit = 3): Promise<BlogCard[]> {
  const rows = await db
    .select({ post: blogPosts, coverUrl: mediaAssets.url })
    .from(blogPosts)
    .leftJoin(mediaAssets, eq(blogPosts.coverMediaId, mediaAssets.id))
    .where(and(eq(blogPosts.status, "published"), eq(blogPosts.category, category)))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(20);

  return rows
    .map(({ post, coverUrl }) => toCard(post, coverUrl))
    .filter((post) => post.slug !== slug)
    .slice(0, limit);
}
