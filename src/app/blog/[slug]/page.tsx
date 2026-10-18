import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "@/components/site/Footer";
import SiteNav from "@/components/site/SiteNav";
import { renderMarkdown } from "@/lib/markdown";
import { getPublishedPost, relatedPosts } from "@/lib/blog";
import { loadContent, loadNavItems, loadSocialLinks } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Article not found — Amates Solutions" };
  return {
    title: `${post.seoTitle || post.title} — Amates Solutions`,
    description: post.seoDescription || post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [content, nav, social] = await Promise.all([
    loadContent(),
    loadNavItems(),
    loadSocialLinks(),
  ]);

  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const related = await relatedPosts(post.slug, post.category);

  return (
    <main className="min-h-screen bg-white">
      <SiteNav nav={nav} social={social} content={content} />

      <article className="bg-navy-950 pb-16 pt-32 sm:pt-40">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-solar-300 transition hover:text-solar-200"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            All articles
          </Link>

          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-solar-400">
            {post.category}
            {post.publishedAt
              ? ` · ${new Date(post.publishedAt).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}`
              : ""}
          </p>

          <h1 className="mt-3 text-h2 font-extrabold tracking-tight text-white">
            {post.title}
          </h1>

          {post.excerpt ? (
            <p className="mt-5 text-[15px] leading-relaxed text-slate-300">{post.excerpt}</p>
          ) : null}

          <p className="mt-6 text-xs text-slate-400">By {post.author}</p>

          {post.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/15 px-3 py-1 text-[11px] uppercase tracking-wider text-slate-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </article>

      {post.coverSrc ? (
        <div className="mx-auto -mt-8 max-w-4xl px-5 sm:px-8">
          <div className="overflow-hidden rounded-3xl shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverSrc} alt={post.title} className="h-64 w-full object-cover sm:h-80" />
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <div
          className="proposal-body text-[15px] leading-relaxed text-slate-700"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
        />

        <div className="mt-12 rounded-3xl border border-solar-200 bg-solar-50 p-7">
          <h2 className="text-lg font-extrabold text-navy-900">{content.quoteTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{content.quoteBody}</p>
          <a
            href="/#quote"
            className="mt-5 inline-flex rounded-full bg-navy-900 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950"
          >
            {content.quoteCta}
          </a>
        </div>

        {related.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Keep reading
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {related.map((item) => (
                <Link key={item.id} href={`/blog/${item.slug}`} className="group">
                  <article className="h-full rounded-2xl border border-slate-200 p-4 transition hover:-translate-y-1 hover:border-solar-300 hover:shadow-lg">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-solar-700">
                      {item.category}
                    </p>
                    <h3 className="mt-1.5 text-sm font-bold leading-snug text-navy-900 group-hover:text-solar-700">
                      {item.title}
                    </h3>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <Footer content={content} nav={nav} social={social} />
    </main>
  );
}
