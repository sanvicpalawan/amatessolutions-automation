import { desc } from "drizzle-orm";

import BlogManager from "@/components/admin/BlogManager";
import PageHeader from "@/components/admin/PageHeader";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt));

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="Content"
        title="Blog"
        description="Write, publish and manage articles. Drafts stay hidden from the public site."
      />
      <BlogManager
        initialPosts={rows.map((row) => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          status: row.status,
          category: row.category,
          featured: row.featured,
          author: row.author,
          publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
          updatedAt: row.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
