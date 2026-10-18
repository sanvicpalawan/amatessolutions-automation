import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { mediaAssets, noteComments, notes } from "@/db/schema";

/**
 * Data layer for "David's Notes".
 *
 * A note is an update plus any number of reference links and attached images
 * (images are ordinary `media_assets` rows, so they are uploaded and served by
 * the same machinery as the rest of the backoffice). Comments hang off a note.
 */

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

export type NoteInput = {
  title: string;
  body: string;
  urls: unknown;
  mediaIds: unknown;
  author?: string;
  pinned?: boolean;
};

const MAX_URLS = 25;
const MAX_IMAGES = 30;
const MAX_BODY = 20_000;

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function numberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
    .slice(0, MAX_IMAGES);
}

/** Adds a scheme to a bare domain; returns null for anything unusable. */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Cleans, de-duplicates and caps a list of links typed by hand. */
export function normalizeUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const cleaned = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const url = normalizeUrl(item);
    if (url) cleaned.add(url);
  }
  return Array.from(cleaned).slice(0, MAX_URLS);
}

export async function listNotes(): Promise<NoteView[]> {
  const rows = await db.select().from(notes).orderBy(desc(notes.pinned), desc(notes.createdAt));
  const noteIds = rows.map((row) => row.id);
  const mediaIds = Array.from(new Set(rows.flatMap((row) => numberArray(row.mediaIds))));

  const commentRows = noteIds.length
    ? await db
        .select()
        .from(noteComments)
        .where(inArray(noteComments.noteId, noteIds))
        .orderBy(asc(noteComments.createdAt))
    : [];

  const mediaRows = mediaIds.length
    ? await db
        .select({
          id: mediaAssets.id,
          name: mediaAssets.name,
          alt: mediaAssets.alt,
          url: mediaAssets.url,
        })
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, mediaIds))
    : [];

  const mediaById = new Map(mediaRows.map((row) => [row.id, row]));

  const commentsByNote = new Map<number, NoteCommentView[]>();
  for (const row of commentRows) {
    const list = commentsByNote.get(row.noteId) ?? [];
    list.push({
      id: row.id,
      author: row.author,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    });
    commentsByNote.set(row.noteId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    urls: stringArray(row.urls),
    images: numberArray(row.mediaIds)
      .map((id) => mediaById.get(id))
      .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        alt: asset.alt,
        src: asset.url ?? `/api/media/${asset.id}`,
      })),
    author: row.author,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    comments: commentsByNote.get(row.id) ?? [],
  }));
}

export async function createNote(input: NoteInput): Promise<number> {
  const [row] = await db
    .insert(notes)
    .values({
      title: input.title.trim().slice(0, 200),
      body: input.body.slice(0, MAX_BODY),
      urls: normalizeUrls(input.urls),
      mediaIds: numberArray(input.mediaIds),
      author: (input.author ?? "David").trim().slice(0, 60) || "David",
      pinned: input.pinned === true,
    })
    .returning({ id: notes.id });

  return row.id;
}

export async function updateNote(id: number, patch: Partial<NoteInput>): Promise<boolean> {
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof patch.title === "string") update.title = patch.title.trim().slice(0, 200);
  if (typeof patch.body === "string") update.body = patch.body.slice(0, MAX_BODY);
  if (patch.urls !== undefined) update.urls = normalizeUrls(patch.urls);
  if (patch.mediaIds !== undefined) update.mediaIds = numberArray(patch.mediaIds);
  if (typeof patch.author === "string") {
    update.author = patch.author.trim().slice(0, 60) || "David";
  }
  if (typeof patch.pinned === "boolean") update.pinned = patch.pinned;

  const rows = await db.update(notes).set(update).where(eq(notes.id, id)).returning({ id: notes.id });
  return rows.length > 0;
}

export async function deleteNote(id: number): Promise<boolean> {
  const rows = await db.delete(notes).where(eq(notes.id, id)).returning({ id: notes.id });
  return rows.length > 0;
}

export async function addComment(
  noteId: number,
  author: string,
  body: string,
): Promise<NoteCommentView | null> {
  const exists = await db.select({ id: notes.id }).from(notes).where(eq(notes.id, noteId)).limit(1);
  if (!exists[0]) return null;

  const [row] = await db
    .insert(noteComments)
    .values({
      noteId,
      author: author.trim().slice(0, 60) || "Partner",
      body: body.trim().slice(0, 4000),
    })
    .returning();

  return {
    id: row.id,
    author: row.author,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function deleteComment(noteId: number, commentId: number): Promise<boolean> {
  const rows = await db
    .delete(noteComments)
    .where(and(eq(noteComments.id, commentId), eq(noteComments.noteId, noteId)))
    .returning({ id: noteComments.id });

  return rows.length > 0;
}
