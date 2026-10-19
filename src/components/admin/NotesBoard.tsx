"use client";

import { useMemo, useRef, useState } from "react";

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

type SortKey = "newest" | "oldest" | "updated" | "discussed";
type FilterKey = "all" | "pinned" | "photos" | "discussed" | "quiet";

const EMPTY_DRAFT: Draft = { id: null, title: "", body: "", urls: [""], images: [], pinned: false };

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently edited" },
  { value: "discussed", label: "Most discussed" },
];

const FILTERS: { value: FilterKey; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "StickyNote" },
  { value: "pinned", label: "Pinned", icon: "Pin" },
  { value: "photos", label: "With photos", icon: "Image" },
  { value: "discussed", label: "Discussed", icon: "MessageSquare" },
  { value: "quiet", label: "No replies", icon: "Clock" },
];

/** How many notes render before the "show more" button. Keeps long histories fast. */
const PAGE_SIZE = 20;

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

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Asia/Manila",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Asia/Manila",
    month: "long",
    year: "numeric",
  });
}

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** One-line gist of the note body, used on collapsed rows. */
function preview(body: string, max = 165): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max).replace(/[\s,;:.]+\S*$/, "")}…`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_TONES = [
  "bg-solar-100 text-solar-800",
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-slate-200 text-slate-700",
];

function avatarTone(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 9973;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

const labelClass = "block text-[11px] font-bold uppercase tracking-wider text-slate-500";
const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30";

const chipClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition ${
    active
      ? "border-navy-900 bg-navy-900 text-white"
      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
  }`;

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

  const [composerOpen, setComposerOpen] = useState(initialNotes.length === 0);
  const [openNoteId, setOpenNoteId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

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
      setComposerOpen(false);
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
    setComposerOpen(true);
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
    if (openNoteId === note.id) setOpenNoteId(null);
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

  const counts = useMemo(() => {
    return {
      all: notes.length,
      pinned: notes.filter((note) => note.pinned).length,
      photos: notes.filter((note) => note.images.length > 0).length,
      discussed: notes.filter((note) => note.comments.length > 0).length,
      quiet: notes.filter((note) => note.comments.length === 0).length,
    } satisfies Record<FilterKey, number>;
  }, [notes]);

  const view = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = notes;

    if (needle) {
      list = list.filter((note) =>
        `${note.title} ${note.body} ${note.author} ${note.urls.join(" ")}`
          .toLowerCase()
          .includes(needle),
      );
    }
    if (filter === "pinned") list = list.filter((note) => note.pinned);
    if (filter === "photos") list = list.filter((note) => note.images.length > 0);
    if (filter === "discussed") list = list.filter((note) => note.comments.length > 0);
    if (filter === "quiet") list = list.filter((note) => note.comments.length === 0);

    const sorted = [...list];
    switch (sort) {
      case "oldest":
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
        break;
      case "updated":
        sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id);
        break;
      case "discussed":
        sorted.sort(
          (a, b) => b.comments.length - a.comments.length || b.createdAt.localeCompare(a.createdAt),
        );
        break;
      default:
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
    }

    const pinned = sorted.filter((note) => note.pinned);
    const groups: { label: string; notes: NoteView[] }[] = [];
    for (const note of sorted) {
      if (note.pinned) continue;
      const label = monthLabel(note.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.notes.push(note);
      else groups.push({ label, notes: [note] });
    }

    return { pinned, groups, total: sorted.length, totalNotes: notes.length };
  }, [notes, query, filter, sort]);

  /** Slice the grouped view down to `limit` rows without cutting a group header loose. */
  const shown = useMemo(() => {
    const pinned = view.pinned.slice(0, limit);
    let remaining = limit - pinned.length;
    const groups: { label: string; notes: NoteView[] }[] = [];
    for (const group of view.groups) {
      if (remaining <= 0) break;
      const slice = group.notes.slice(0, remaining);
      remaining -= slice.length;
      groups.push({ label: group.label, notes: slice });
    }
    return { pinned, groups, count: limit - remaining };
  }, [view, limit]);

  function resetPaging() {
    setLimit(PAGE_SIZE);
  }

  const editing = draft.id !== null;
  const filtering = query.trim().length > 0 || filter !== "all";

  const renderCard = (note: NoteView) => {
    const open = openNoteId === note.id;
    const gist = preview(note.body);
    return (
      <article
        key={note.id}
        className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
          open ? "border-solar-300 ring-1 ring-solar-400/20" : "border-slate-200 hover:border-solar-300"
        }`}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpenNoteId(open ? null : note.id)}
          className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
        >
          <span
            className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[11px] font-bold uppercase ${avatarTone(
              note.author,
            )}`}
          >
            {initials(note.author)}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {note.pinned ? <Icon name="Pin" className="h-3.5 w-3.5 text-solar-500" /> : null}
              <span className="truncate text-sm font-extrabold tracking-tight text-navy-900">
                {note.title || preview(note.body, 80) || "Untitled note"}
              </span>
            </span>

            {gist && note.title ? (
              <span className="mt-1 block truncate text-xs text-slate-500">{gist}</span>
            ) : null}

            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>{note.author}</span>
              <span className="inline-flex items-center gap-1">
                <Icon name="Clock" className="h-3 w-3" />
                {formatDay(note.createdAt)}
              </span>
              {note.images.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-solar-600">
                  <Icon name="Image" className="h-3 w-3" />
                  {note.images.length}
                </span>
              ) : null}
              {note.urls.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="Link2" className="h-3 w-3" />
                  {note.urls.length}
                </span>
              ) : null}
              {note.comments.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-navy-900">
                  <Icon name="MessageSquare" className="h-3 w-3" />
                  {note.comments.length}
                </span>
              ) : (
                <span>No replies yet</span>
              )}
            </span>
          </span>

          <Icon
            name="ChevronRight"
            className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition ${
              open ? "rotate-90 text-solar-500" : ""
            }`}
          />
        </button>

        {open ? (
          <div className="border-t border-slate-100 px-4 pb-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void togglePin(note)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-solar-400 hover:text-solar-600"
              >
                {note.pinned ? "Unpin" : "Pin to top"}
              </button>
              <button
                type="button"
                onClick={() => startEdit(note)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-slate-400"
              >
                <Icon name="Pencil" className="h-3 w-3" /> Edit
              </button>
              <button
                type="button"
                onClick={() => void removeNote(note)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition hover:border-red-300 hover:text-red-500"
              >
                <Icon name="Trash2" className="h-3 w-3" /> Delete
              </button>
            </div>

            {note.body ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
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
                    className="h-32 w-32 overflow-hidden rounded-xl border border-slate-200 transition hover:border-solar-400"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            ) : null}

            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Icon name="MessageSquare" className="h-3.5 w-3.5" />
                {note.comments.length === 0
                  ? "No replies yet"
                  : `${note.comments.length} repl${note.comments.length === 1 ? "y" : "ies"}`}
              </p>

              {note.comments.map((comment) => (
                <div key={comment.id} className="mt-3 flex gap-2.5 rounded-xl bg-slate-50 px-3.5 py-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold uppercase ${avatarTone(
                      comment.author,
                    )}`}
                  >
                    {initials(comment.author)}
                  </span>
                  <div className="min-w-0 flex-1">
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
                </div>
              ))}

              <div className="mt-3 flex items-end gap-2">
                <textarea
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-solar-400 focus:ring-2 focus:ring-solar-400/30"
                  rows={1}
                  placeholder={`Reply as ${yourName.trim() || "Partner"}…`}
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
                  Reply
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <div ref={formTop} className="space-y-5">
      {/* ---------------- Composer ---------------- */}
      <section
        className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
          editing ? "border-solar-300" : "border-slate-200"
        }`}
      >
        <button
          type="button"
          aria-expanded={composerOpen}
          onClick={() => setComposerOpen((open) => !open)}
          className="flex w-full items-center gap-3 px-5 py-4 text-left"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-solar-400 text-navy-950">
            <Icon name={editing ? "Pencil" : "Plus"} className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold tracking-tight text-navy-900">
              {editing ? `Editing note #${draft.id}` : "Write a note"}
            </span>
            <span className="block text-xs text-slate-500">
              {editing
                ? "Change it and save — your partners see the update straight away."
                : "Share an update, a link or a photo with your partners."}
            </span>
          </span>
          <Icon
            name="ChevronRight"
            className={`h-4 w-4 shrink-0 text-slate-400 transition ${composerOpen ? "rotate-90" : ""}`}
          />
        </button>

        {composerOpen ? (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4">
            <div className="grid gap-4">
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
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={draft.pinned}
                    onChange={(event) => setDraft({ ...draft, pinned: event.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Pin to the top
                </label>

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

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy || pendingUploads > 0}
                  className="rounded-full bg-solar-400 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-950 transition hover:bg-solar-300 disabled:opacity-60"
                >
                  {busy ? "Saving…" : editing ? "Save changes" : "Post note"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(EMPTY_DRAFT);
                    setComposerOpen(false);
                  }}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-slate-400"
                >
                  {editing ? "Cancel edit" : "Close"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* ---------------- Toolbar ---------------- */}
      {view.totalNotes > 0 ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Icon
                name="Search"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  resetPaging();
                }}
                placeholder="Search headings, notes, links and names…"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-solar-400 focus:ring-4 focus:ring-solar-400/15"
              />
            </div>
            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as SortKey);
                resetPaging();
              }}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setFilter(item.value);
                  resetPaging();
                }}
                className={chipClass(filter === item.value)}
              >
                <Icon name={item.icon} className="h-3.5 w-3.5" />
                {item.label}
                <span className={filter === item.value ? "text-white/70" : "text-slate-400"}>
                  {counts[item.value]}
                </span>
              </button>
            ))}
            <span className="ml-auto text-xs font-semibold text-slate-500">
              {view.total === view.totalNotes
                ? `${view.totalNotes} note${view.totalNotes === 1 ? "" : "s"}`
                : `${view.total} of ${view.totalNotes} notes`}
            </span>
          </div>
        </section>
      ) : null}

      {/* ---------------- Feed ---------------- */}
      {view.totalNotes === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-solar-50 text-solar-600">
            <Icon name="StickyNote" className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-bold text-navy-900">No notes yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Write the first one above — your partners will see it here.
          </p>
        </div>
      ) : view.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <Icon name="Search" className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-navy-900">Nothing matches</p>
          <p className="mt-1 text-sm text-slate-500">
            Try a different word, or clear the filters to see everything.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
              resetPaging();
            }}
            className="mt-4 rounded-full border border-slate-300 px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 transition hover:border-slate-400"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {shown.pinned.length > 0 ? (
            <section>
              <h2 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-solar-600">
                <Icon name="Pin" className="h-3.5 w-3.5" />
                Pinned
                <span className="text-slate-400">{view.pinned.length}</span>
              </h2>
              <div className="space-y-3">{shown.pinned.map(renderCard)}</div>
            </section>
          ) : null}

          {shown.groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <Icon name="Calendar" className="h-3.5 w-3.5 text-slate-400" />
                {group.label}
                <span className="text-slate-300">{group.notes.length}</span>
              </h2>
              <div className="space-y-3">{group.notes.map(renderCard)}</div>
            </section>
          ))}

          {shown.count < view.total ? (
            <button
              type="button"
              onClick={() => setLimit((current) => current + PAGE_SIZE)}
              className="w-full rounded-2xl border border-dashed border-slate-300 bg-white py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 transition hover:border-solar-400 hover:text-solar-600"
            >
              Show {Math.min(PAGE_SIZE, view.total - shown.count)} more
              <span className="ml-1 text-slate-400">
                ({shown.count} of {view.total})
              </span>
            </button>
          ) : null}

          {filtering ? null : (
            <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Everything is up to date
            </p>
          )}
        </div>
      )}
    </div>
  );
}
