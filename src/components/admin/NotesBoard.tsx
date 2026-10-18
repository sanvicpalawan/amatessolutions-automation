"use client";

import { useRef, useState } from "react";

import { Icon } from "@/lib/icons";

export type NoteImage = { id: number; name: string; src: string; alt: string };

export type NoteCommentView = {
  id: number;
  author: string;
  body: string;
  createdAt: string;
};

export type NoteView = {
  id: number;
  title: string;
  body: string;
  urls: string[];
  images: NoteImage[];
  author: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  comments: NoteCommentView[];
};

type Draft = {
  id: number | null;
  title: string;
  body: string;
  urls: string[];
  images: NoteImage[];
  pinned: boolean;
};

const EMPTY_DRAFT: Draft = { id: null, title: "", body: "", urls: [""], images: [], pinned: false };

/** Fixed locale + timezone so server and client render the same string. */
function formatStamp(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Manila",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-slate-500";
const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30";

export default function NotesBoard({
  initialNotes,
  ownerName,
}: {
  initialNotes: NoteView[];
  ownerName: string;
}) {
  const [notes, setNotes] = useState<NoteView[]>(initialNotes);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [yourName, setYourName] = useState(ownerName);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);
  const formTop = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    const response = await fetch("/api/admin/notes", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { notes: NoteView[] };
    setNotes(payload.notes);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    const chosen = Array.from(files);
    setPendingUploads(chosen.length);

    const uploaded: NoteImage[] = [];
    for (const file of chosen) {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "notes");
      try {
        const response = await fetch("/api/media", { method: "POST", body: form });
        const payload = (await response.json()) as {
          id?: number;
          src?: string;
          name?: string;
          error?: string;
        };
        if (!response.ok || !payload.id || !payload.src) {
          setError(payload.error ?? `Could not upload ${file.name}.`);
        } else {
          uploaded.push({
            id: payload.id,
            name: payload.name ?? file.name,
            alt: file.name,
            src: payload.src,
          });
        }
      } catch {
        setError(`Could not upload ${file.name}.`);
      } finally {
        setPendingUploads((count) => Math.max(0, count - 1));
      }
    }

    if (uploaded.length > 0) {
      setDraft((current) => ({ ...current, images: [...current.images, ...uploaded].slice(0, 30) }));
    }
  }

  async function save() {
    if (busy) return;
    setError("");

    if (!draft.title.trim() && !draft.body.trim() && draft.images.length === 0) {
      setError("Add a heading, some notes or an image before saving.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(draft.id ? `/api/admin/notes/${draft.id}` : "/api/admin/notes", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          body: draft.body,
          urls: draft.urls,
          mediaIds: draft.images.map((image) => image.id),
          author: yourName.trim() || "David",
          pinned: draft.pinned,
        }),
      });

      if (!response.ok) {
        const problem = (await response.json().catch(() => ({}))) as { error?: string };
        setError(problem.error ?? "Could not save the note.");
        return;
      }

      setDraft(EMPTY_DRAFT);
      await refresh();
    } catch {
      setError("Could not save the note.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(note: NoteView) {
    setError("");
    setDraft({
      id: note.id,
      title: note.title,
      body: note.body,
      urls: note.urls.length > 0 ? note.urls : [""],
      images: note.images,
      pinned: note.pinned,
    });
    formTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function togglePin(note: NoteView) {
    await fetch(`/api/admin/notes/${note.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pinned: !note.pinned }),
    });
    await refresh();
  }

  async function removeNote(note: NoteView) {
    if (!confirm("Delete this note and all of its comments?")) return;
    await fetch(`/api/admin/notes/${note.id}`, { method: "DELETE" });
    if (draft.id === note.id) setDraft(EMPTY_DRAFT);
    await refresh();
  }

  async function postComment(note: NoteView) {
    const text = (commentDrafts[note.id] ?? "").trim();
    if (!text) return;
    const response = await fetch(`/api/admin/notes/${note.id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ author: yourName.trim() || "Partner", body: text }),
    });
    if (response.ok) {
      setCommentDrafts((current) => ({ ...current, [note.id]: "" }));
      await refresh();
    }
  }

  async function removeComment(noteId: number, commentId: number) {
    if (!confirm("Delete this comment?")) return;
    await fetch(`/api/admin/notes/${noteId}/comments?commentId=${commentId}`, { method: "DELETE" });
    await refresh();
  }

  const editing = draft.id !== null;

  return (
    <div ref={formTop} className="space-y-6">
      {/* ---------------- Editor ---------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
            {editing ? `Editing note #${draft.id}` : "New note"}
          </h2>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            Pin to the top
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <label className={labelClass} htmlFor="note-title">
              Heading
            </label>
            <input
              id="note-title"
              className={inputClass}
              value={draft.title}
              maxLength={200}
              placeholder="e.g. El Nido quote sent, Coron site survey booked"
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="note-body">
              Notes
            </label>
            <textarea
              id="note-body"
              className={`${inputClass} min-h-[140px] leading-relaxed`}
              value={draft.body}
              placeholder="What happened, what you decided, what the partners should know…"
              onChange={(event) => setDraft({ ...draft, body: event.target.value })}
            />
          </div>

          {/* Links */}
          <div>
            <span className={labelClass}>Links</span>
            <div className="mt-1.5 space-y-2">
              {draft.urls.map((url, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Icon name="Link2" className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30"
                    value={url}
                    placeholder="https://…  (paste any link — a domain alone is fine)"
                    onChange={(event) => {
                      const next = [...draft.urls];
                      next[index] = event.target.value;
                      setDraft({ ...draft, urls: next });
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Remove link"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        urls: draft.urls.length > 1 ? draft.urls.filter((_, i) => i !== index) : [""],
                      })
                    }
                    className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-300 hover:text-red-500"
                  >
                    <Icon name="X" className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, urls: [...draft.urls, ""] })}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-solar-600 transition hover:text-solar-500"
            >
              <Icon name="Plus" className="h-3.5 w-3.5" /> Add another link
            </button>
          </div>

          {/* Images */}
          <div>
            <span className={labelClass}>Images</span>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              {draft.images.map((image) => (
                <div
                  key={image.id}
                  className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() =>
                      setDraft({ ...draft, images: draft.images.filter((i) => i.id !== image.id) })
                    }
                    className="absolute right-1 top-1 rounded-full bg-navy-950/80 p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                  >
                    <Icon name="X" className="h-3 w-3" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={pendingUploads > 0}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 text-slate-400 transition hover:border-solar-400 hover:text-solar-500 disabled:opacity-60"
              >
                <Icon name="ImagePlus" className="h-5 w-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {pendingUploads > 0 ? "Uploading…" : "Add photos"}
                </span>
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                void uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <p className="mt-2 text-xs text-slate-500">
              Pick as many as you like from your device — up to 4 MB each. They are stored with the
              site and survive redeploys.
            </p>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || pendingUploads > 0}
              className="rounded-full bg-solar-400 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-950 transition hover:bg-solar-300 disabled:opacity-60"
            >
              {busy ? "Saving…" : editing ? "Save changes" : "Post note"}
            </button>
            {editing ? (
              <button
                type="button"
                onClick={() => setDraft(EMPTY_DRAFT)}
                className="rounded-full border border-slate-300 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-slate-400"
              >
                Cancel
              </button>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Your name
              </span>
              <input
                className="w-36 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={yourName}
                maxLength={60}
                onChange={(event) => setYourName(event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Feed ---------------- */}
      {notes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
          Nothing posted yet. Write the first note above — your partners will see it here.
        </p>
      ) : (
        <div className="space-y-5">
          {notes.map((note) => (
            <article
              key={note.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-navy-900">
                    {note.pinned ? <Icon name="Pin" className="h-4 w-4 text-solar-500" /> : null}
                    {note.title || "Untitled note"}
                  </h3>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {note.author} · {formatStamp(note.createdAt)}
                    {note.updatedAt !== note.createdAt ? ` · edited ${formatStamp(note.updatedAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void togglePin(note)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 transition hover:border-solar-400 hover:text-solar-600"
                  >
                    {note.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(note)}
                    aria-label="Edit note"
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-400 hover:text-navy-900"
                  >
                    <Icon name="Pencil" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeNote(note)}
                    aria-label="Delete note"
                    className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-300 hover:text-red-500"
                  >
                    <Icon name="Trash2" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </header>

              {note.body ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {note.body}
                </p>
              ) : null}

              {note.urls.length > 0 ? (
                <ul className="mt-4 space-y-1.5">
                  {note.urls.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-solar-600 underline decoration-solar-300 underline-offset-2 transition hover:text-solar-500"
                      >
                        <Icon name="ExternalLink" className="h-3.5 w-3.5" />
                        {hostLabel(url)}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}

              {note.images.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {note.images.map((image) => (
                    <a
                      key={image.id}
                      href={image.src}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="h-28 w-28 overflow-hidden rounded-xl border border-slate-200 transition hover:border-solar-400"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}

              {/* Comments */}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Icon name="MessageSquare" className="h-3.5 w-3.5" />
                  {note.comments.length === 0
                    ? "No comments yet"
                    : `${note.comments.length} comment${note.comments.length === 1 ? "" : "s"}`}
                </p>

                {note.comments.map((comment) => (
                  <div key={comment.id} className="mt-3 rounded-xl bg-slate-50 px-3.5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-navy-900">{comment.author}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {formatStamp(comment.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Delete comment"
                        onClick={() => void removeComment(note.id, comment.id)}
                        className="text-slate-300 transition hover:text-red-500"
                      >
                        <Icon name="X" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
                  </div>
                ))}

                <div className="mt-3 flex items-end gap-2">
                  <textarea
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30"
                    rows={1}
                    placeholder={`Comment as ${yourName.trim() || "Partner"}…`}
                    value={commentDrafts[note.id] ?? ""}
                    onChange={(event) =>
                      setCommentDrafts((current) => ({ ...current, [note.id]: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => void postComment(note)}
                    disabled={!(commentDrafts[note.id] ?? "").trim()}
                    className="rounded-xl bg-navy-900 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-navy-800 disabled:opacity-40"
                  >
                    Comment
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
