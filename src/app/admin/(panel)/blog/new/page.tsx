import Link from "next/link";

import BlogEditor from "@/components/admin/BlogEditor";
import PageHeader from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export default function NewBlogPostPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="Content"
        title="New blog post"
        description="Write in Markdown, attach a cover image, then publish when ready."
        action={
          <Link
            href="/admin/blog"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:bg-white"
          >
            ← All posts
          </Link>
        }
      />
      <BlogEditor />
    </div>
  );
}
