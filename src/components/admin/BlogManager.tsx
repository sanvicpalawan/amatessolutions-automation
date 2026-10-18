"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  status: string;
  category: string;
  featured: boolean;
  author: string;
  publishedAt: string | null;
  updatedAt: string;
};

export default function BlogManager({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/blog", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { posts: Post[] };
      setPosts(payload.posts);
    })();
  }, []);

  async function toggleStatus(post: Post) {
    setBusy(post.id);
    setNote("");
    const next = post.status === "published" ? "draft" : "published";
    const response = await fetch(`/api/admin/blog/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (response.ok) {
      const payload = (await response.json()) as { post: Post };
      setPosts((prev) => prev.map((item) => (item.id === post.id ? payload.post : item)));
      setNote(`"${post.title}" is now ${next}.`);
    }
    setBusy(null);
  }

  async function toggleFeatured(post: Post) {
    setBusy(post.id);
    await fetch(`/api/admin/blog/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !post.featured }),
    });
    setPosts((prev) =>
      prev.map((item) => (item.id === post.id ? { ...item, featured: !item.featured } : item)),
    );
    setBusy(null);
  }

  async function remove(post: Post) {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setBusy(post.id);
    await fetch(`/api/admin/blog/${post.id}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((item) => item.id !== post.id));
    setNote(`Deleted "${post.title}".`);
    setBusy(null);
  }

  const published = posts.filter((post) => post.status === "published").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {posts.length} post{posts.length === 1 ? "" : "s"} · {published} published
        </p>
        <Link
          href="/admin/blog/new"
          className="rounded-full bg-solar-400 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-950 transition hover:bg-solar-300"
        >
          + New post
        </Link>
      </div>

      {note ? (
        <p className="mt-4 rounded-xl bg-solar-50 px-4 py-3 text-xs font-medium text-navy-800">{note}</p>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Blog posts table, scroll horizontally on small screens">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Featured</th>
                <th className="px-5 py-3">Updated</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {posts.map((post) => (
                <tr key={post.id} className="transition hover:bg-solar-50/40">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-navy-900">{post.title}</p>
                    <p className="text-[11px] text-slate-400">/blog/{post.slug}</p>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{post.category}</td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      disabled={busy === post.id}
                      onClick={() => toggleStatus(post)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                        post.status === "published"
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {post.status}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      disabled={busy === post.id}
                      onClick={() => toggleFeatured(post)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition ${
                        post.featured
                          ? "bg-solar-100 text-solar-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {post.featured ? "Featured" : "—"}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {new Date(post.updatedAt).toLocaleDateString("en-PH")}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {post.status === "published" ? (
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:bg-slate-50"
                        >
                          View
                        </Link>
                      ) : null}
                      <Link
                        href={`/admin/blog/${post.id}`}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:bg-slate-50"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={busy === post.id}
                        onClick={() => remove(post)}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <p className="text-sm text-slate-500">No posts yet.</p>
                    <Link
                      href="/admin/blog/new"
                      className="mt-3 inline-block rounded-full bg-solar-400 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-950"
                    >
                      Write your first article
                    </Link>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
