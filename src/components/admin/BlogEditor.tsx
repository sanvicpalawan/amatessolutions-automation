"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import MediaLibrary from "@/components/admin/MediaLibrary";
import { renderMarkdown } from "@/lib/markdown";
import { slugify } from "@/lib/slug";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverMediaId: number | null;
  category: string;
  tags: string[];
  author: string;
  status: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
};

const EMPTY: Post = {
  id: 0,
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  coverMediaId: null,
  category: "Insights",
  tags: [],
  author: "Amates Solutions",
  status: "draft",
  seoTitle: "",
  seoDescription: "",
  featured: false,
};

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-solar-400 focus:ring-4 focus:ring-solar-400/15";

const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-navy-800";

export default function BlogEditor({ postId }: { postId?: number }) {
  const router = useRouter();
  const isNew = !postId;

  const [post, setPost] = useState<Post>(EMPTY);
  const [tagText, setTagText] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (isNew) return;
    void (async () => {
      const response = await fetch(`/api/admin/blog/${postId}`, { cache: "no-store" });
      if (!response.ok) {
        setError("Could not load that post.");
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as { post: Post };
      setPost(payload.post);
      setTagText((payload.post.tags ?? []).join(", "));
      setLoading(false);
    })();
  }, [isNew, postId]);

  function set<K extends keyof Post>(key: K, value: Post[K]) {
    setPost((prev) => ({ ...prev, [key]: value }));
  }

  async function save(publish = false) {
    setSaving(true);
    setError("");

    const payload = {
      ...post,
      slug: post.slug || slugify(post.title),
      status: publish ? "published" : post.status,
      tags: tagText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    const response = await fetch(isNew ? "/api/admin/blog" : `/api/admin/blog/${postId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not save the post.");
      setSaving(false);
      return;
    }

    if (isNew) {
      router.push(`/admin/blog/${body.post.id}`);
    } else {
      setPost({ ...post, ...body.post });
    }
    setSaving(false);
    router.refresh();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading post…</p>;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Article</h2>
          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className={labelClass}>Title *</span>
              <input
                className={inputClass}
                value={post.title}
                onChange={(event) => {
                  set("title", event.target.value);
                  if (isNew) set("slug", slugify(event.target.value));
                }}
                placeholder="Why marine-grade mounting matters on Palawan rooftops"
              />
            </label>

            <label className="block">
              <span className={labelClass}>URL slug</span>
              <input
                className={inputClass}
                value={post.slug}
                onChange={(event) => set("slug", slugify(event.target.value))}
                placeholder="marine-grade-mounting-palawan"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Public URL: /blog/{post.slug || "…"}
              </span>
            </label>

            <label className="block">
              <span className={labelClass}>Excerpt</span>
              <textarea
                rows={2}
                className={inputClass}
                value={post.excerpt}
                onChange={(event) => set("excerpt", event.target.value)}
                placeholder="One or two sentences shown on the blog index and in search results."
              />
            </label>

            <label className="block">
              <span className={labelClass}>Content (Markdown)</span>
              <textarea
                rows={18}
                className={`${inputClass} font-mono text-[13px] leading-relaxed`}
                value={post.content}
                onChange={(event) => set("content", event.target.value)}
                placeholder={"## Heading\n\nWrite in **Markdown**…\n\n- bullet\n- bullet"}
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                Supports # headings, **bold**, *italic*, `code`, - lists and | tables |.
              </span>
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Publishing</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Category</span>
              <input
                className={inputClass}
                value={post.category}
                onChange={(event) => set("category", event.target.value)}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Author</span>
              <input
                className={inputClass}
                value={post.author}
                onChange={(event) => set("author", event.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelClass}>Tags (comma separated)</span>
              <input
                className={inputClass}
                value={tagText}
                onChange={(event) => setTagText(event.target.value)}
                placeholder="marine-grade, typhoon, maintenance"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-navy-800 sm:col-span-2">
              <input
                type="checkbox"
                checked={post.featured}
                onChange={(event) => set("featured", event.target.checked)}
              />
              Feature this post at the top of the blog index
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">SEO</h2>
          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className={labelClass}>Meta title</span>
              <input
                className={inputClass}
                value={post.seoTitle}
                onChange={(event) => set("seoTitle", event.target.value)}
                placeholder={post.title || "Defaults to the post title"}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Meta description</span>
              <textarea
                rows={2}
                className={inputClass}
                value={post.seoDescription}
                onChange={(event) => set("seoDescription", event.target.value)}
                placeholder={post.excerpt || "Defaults to the excerpt"}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Cover image</h2>
          <div className="mt-3 h-40 overflow-hidden rounded-xl bg-slate-100">
            {post.coverMediaId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${post.coverMediaId}`}
                alt={post.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-wider text-slate-400">
                No cover selected
              </div>
            )}
          </div>
          <div className="mt-3">
            <MediaLibrary
              compact
              onPick={(reference) => set("coverMediaId", Number(reference) || null)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Preview</h2>
            <button
              type="button"
              onClick={() => setPreview((value) => !value)}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider"
            >
              {preview ? "Hide" : "Show"}
            </button>
          </div>
          {preview ? (
            <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-slate-200 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-solar-700">
                {post.category}
              </p>
              <h3 className="mt-1.5 text-lg font-bold text-navy-900">{post.title || "Untitled"}</h3>
              <div
                className="proposal-body mt-3 text-sm text-slate-700"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
              />
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Render the Markdown before publishing to check headings and tables.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">Actions</h2>
          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => save(false)}
              className="rounded-full border border-slate-300 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? "Saving…" : isNew ? "Save as draft" : "Save changes"}
            </button>
            <button
              type="button"
              disabled={saving || !post.title.trim()}
              onClick={() => save(true)}
              className="rounded-full bg-solar-400 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-950 transition hover:bg-solar-300 disabled:opacity-60"
            >
              {post.status === "published" ? "Update live post" : "Publish now"}
            </button>
            {post.status === "published" ? (
              <a
                href={`/blog/${post.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-300 px-5 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:bg-slate-50"
              >
                View live post
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
