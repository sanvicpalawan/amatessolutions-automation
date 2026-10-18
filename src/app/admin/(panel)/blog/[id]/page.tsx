import Link from "next/link";
import { notFound } from "next/navigation";

import BlogEditor from "@/components/admin/BlogEditor";
import PageHeader from "@/components/admin/PageHeader";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AdminBlogEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, postId)).limit(1);
  if (!post) notFound();

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="Content"
        title={post.status === "published" ? "Edit published post" : "Edit draft"}
        description={post.title}
        action={
          <Link
            href="/admin/blog"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:bg-white"
          >
            ← All posts
          </Link>
        }
      />
      <BlogEditor postId={post.id} />
    </div>
  );
}
