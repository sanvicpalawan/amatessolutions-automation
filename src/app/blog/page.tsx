import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import SiteNav from "@/components/site/SiteNav";
import Footer from "@/components/site/Footer";
import { mediaSrc, loadContent, loadNavItems, loadSocialLinks } from "@/lib/site";
import { listPublishedPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const content = await loadContent();
  return {
    title: `${content.blogTitle} — ${content.siteName}`,
    description: content.blogBody,
  };
}

export default async function BlogIndexPage() {
  const [content, nav, social, posts] = await Promise.all([
    loadContent(),
    loadNavItems(),
    loadSocialLinks(),
    listPublishedPosts(),
  ]);

  const [featured, ...rest] = posts;

  return (
    <main className="min-h-screen bg-white">
      <SiteNav nav={nav} social={social} content={content} />

      <section className="bg-navy-950 pb-16 pt-32 sm:pt-40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-solar-400">
            {content.blogEyebrow}
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold uppercase leading-tight tracking-tight text-white sm:text-5xl">
            {content.blogTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-300">
            {content.blogBody}
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          {posts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-sm text-slate-500">
                No published articles yet. Add one from the backoffice at{" "}
                <Link className="font-semibold text-solar-700 underline" href="/admin/blog">
                  /admin/blog
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              {featured ? (
                <Reveal>
                  <Link href={`/blog/${featured.slug}`} className="group block">
                    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-2xl">
                      <div className="grid md:grid-cols-2">
                        <div className="relative h-64 overflow-hidden md:h-full">
                          {featured.coverSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={featured.coverSrc}
                              alt={featured.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-solar-300 to-solar-600" />
                          )}
                          <span className="absolute left-4 top-4 rounded-full bg-solar-400 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-navy-950">
                            Featured
                          </span>
                        </div>
                        <div className="p-7 sm:p-9">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-solar-700">
                            {featured.category} ·{" "}
                            {featured.publishedAt
                              ? new Date(featured.publishedAt).toLocaleDateString("en-PH", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : ""}
                          </p>
                          <h2 className="mt-3 text-2xl font-extrabold leading-tight text-navy-900 group-hover:text-solar-700">
                            {featured.title}
                          </h2>
                          <p className="mt-3 text-sm leading-relaxed text-slate-600">
                            {featured.excerpt}
                          </p>
                          <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-solar-700">
                            Read article
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                </Reveal>
              ) : null}

              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((post: (typeof rest)[number], index: number) => (
                  <Reveal key={post.id} delay={index * 70}>
                    <Link href={`/blog/${post.slug}`} className="group block h-full">
                      <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1.5 hover:shadow-xl">
                        <div className="relative h-44 overflow-hidden">
                          {post.coverSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.coverSrc}
                              alt={post.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-navy-700 to-navy-900" />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-6">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-solar-700">
                            {post.category}
                          </p>
                          <h3 className="mt-2 text-lg font-bold leading-snug text-navy-900 group-hover:text-solar-700">
                            {post.title}
                          </h3>
                          <p className="mt-2.5 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
                            {post.excerpt}
                          </p>
                          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
                            <span>{post.author}</span>
                            <span>
                              {post.publishedAt
                                ? new Date(post.publishedAt).toLocaleDateString("en-PH")
                                : ""}
                            </span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  </Reveal>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer content={content} nav={nav} social={social} />
    </main>
  );
}
