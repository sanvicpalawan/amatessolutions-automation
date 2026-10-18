"use client";

import { useEffect, useRef, useState } from "react";

export type MediaItem = {
  id: number;
  name: string;
  alt: string;
  mime: string;
  size: number;
  url: string | null;
  folder: string;
  createdAt: string;
  src: string;
  uploaded: boolean;
};

type Props = {
  /** Called with the chosen media reference (id as string, or remote URL). */
  onPick: (reference: string) => void;
  /** Hide the picker affordance (used inside the text-fields tab). */
  compact?: boolean;
};

export default function MediaLibrary({ onPick, compact = false }: Props) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/media", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { media: MediaItem[] };
      setMedia(payload.media);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Upload failed.");
        return;
      }
      await load();
      onPick(payload.src as string);
    } finally {
      setUploading(false);
    }
  }

  async function remove(item: MediaItem) {
    if (!confirm(`Delete "${item.name}" from the media library?`)) return;
    await fetch(`/api/media/${item.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className={compact ? "" : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"}>
      {!compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
              Media library
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Upload from your device (stored in the database, survives redeploys) or pick an existing
              image. Click a card to use it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="rounded-full bg-solar-400 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-950 transition hover:bg-solar-300 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "+ Upload image"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      {compact ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="rounded-full border border-slate-300 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:bg-slate-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-xs text-slate-500">Loading library…</p>
      ) : (
        <div
          className={`mt-4 grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}
        >
          {media.map((item) => (
            <div
              key={item.id}
              className={`group relative overflow-hidden rounded-xl border transition ${
                selected === item.id ? "border-solar-400 ring-2 ring-solar-300" : "border-slate-200"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelected(item.id);
                  onPick(String(item.id));
                }}
                className="block w-full"
                title={`Use ${item.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt || item.name}
                  loading="lazy"
                  className={`h-24 w-full object-cover ${compact ? "" : "h-28"}`}
                />
              </button>
              <div className="flex items-center justify-between gap-1 bg-white px-2 py-1.5">
                <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {item.uploaded ? "Uploaded" : "Remote"} · {item.folder}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  title="Delete"
                  className="text-[11px] font-bold text-red-500 opacity-0 transition group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {media.length === 0 ? (
            <p className="col-span-full py-8 text-center text-xs text-slate-500">
              No images yet — upload one from your device.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
