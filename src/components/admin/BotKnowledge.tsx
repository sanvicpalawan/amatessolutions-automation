"use client";

import { useCallback, useEffect, useState } from "react";

import { Icon } from "@/lib/icons";
import {
  BOT_TOPICS,
  MAX_ANSWER_CHARS,
  MAX_CLAUSES,
  MAX_EXTRA_FACTS_CHARS,
  MAX_INTRO_CHARS,
  warrantyAnswer,
  type BotKnowledge,
  type BotTopicKey,
} from "@/lib/bot-knowledge-model";

const cardClass = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
const headingClass = "text-sm font-bold uppercase tracking-wider text-navy-900";
const labelClass = "text-[11px] font-bold uppercase tracking-wider text-navy-800";
const hintClass = "text-[11px] leading-relaxed text-slate-400";
const textAreaClass =
  "w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed";
const primaryButtonClass =
  "rounded-full bg-navy-900 px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-solar-500 hover:text-navy-950 disabled:opacity-50";
const ghostButtonClass =
  "rounded-full border border-slate-300 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:border-navy-300 disabled:opacity-40";
const iconButtonClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:border-red-300 hover:text-red-500 disabled:opacity-40";

/**
 * The bot's knowledge, editable.
 *
 * A single column of boxes on purpose: every field is prose, and prose in a
 * two-column grid on a laptop is unreadable. The root is a `@container` so the
 * clause rows can put their remove button beside the box when there is room and
 * under it when there is not — the admin column is narrower than the window, so
 * viewport breakpoints would measure the wrong thing.
 */
export default function BotKnowledgeEditor() {
  const [knowledge, setKnowledge] = useState<BotKnowledge | null>(null);
  const [saved, setSaved] = useState<BotKnowledge | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const apply = useCallback((next: BotKnowledge) => {
    setKnowledge(next);
    setSaved(next);
    setNote("");
    setError("");
  }, []);

  useEffect(() => {
    // State is only set after the await, which keeps
    // react-hooks/set-state-in-effect happy.
    void (async () => {
      const response = await fetch("/api/admin/bot-knowledge", { cache: "no-store" });
      if (!response.ok) {
        setError("Could not load what the bot knows. Reload the page.");
        return;
      }
      const payload = (await response.json()) as { knowledge: BotKnowledge };
      setKnowledge(payload.knowledge);
      setSaved(payload.knowledge);
    })();
  }, []);

  const dirty = Boolean(knowledge && saved && JSON.stringify(knowledge) !== JSON.stringify(saved));

  function patch(changes: Partial<BotKnowledge>) {
    setKnowledge((current) => (current ? { ...current, ...changes } : current));
  }

  function setAnswer(key: BotTopicKey, value: string) {
    setKnowledge((current) =>
      current ? { ...current, answers: { ...current.answers, [key]: value } } : current,
    );
  }

  function setClause(index: number, value: string) {
    setKnowledge((current) =>
      current
        ? { ...current, warrantyTerms: current.warrantyTerms.map((t, i) => (i === index ? value : t)) }
        : current,
    );
  }

  async function save() {
    if (!knowledge) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/bot-knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledge }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        knowledge?: BotKnowledge;
        error?: string;
      };
      if (!response.ok || !payload.knowledge) {
        setError(payload.error ?? "Could not save. Nothing was changed.");
        return;
      }
      // The server normalises blanks back to the shipped wording, so show what
      // was actually stored rather than what was typed.
      apply(payload.knowledge);
      setNote("Saved. The bot uses this from its next message — no redeploy.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!window.confirm("Put the original wording back for everything on this card?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/bot-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { knowledge?: BotKnowledge };
      if (!response.ok || !payload.knowledge) {
        setError("Could not reset.");
        return;
      }
      apply(payload.knowledge);
      setNote("Back to the original wording.");
    } finally {
      setBusy(false);
    }
  }

  if (!knowledge) {
    return (
      <div className={cardClass}>
        <p className="text-xs text-slate-500">
          {error || "Loading what the bot knows…"}
        </p>
      </div>
    );
  }

  return (
    <div className="@container space-y-5">
      <section className={cardClass}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className={headingClass}>What the bot knows</h3>
          <span
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
              dirty ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"
            }`}
          >
            {dirty ? "Unsaved changes" : "Saved"}
          </span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-600">
          Every answer the bot gives comes from here — the AI reads it, and so does the fixed
          wording it falls back on when the AI is unreachable. That means the bot cannot contradict
          itself, and you never have to ask for a code change to correct something.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void save()} disabled={busy || !dirty} className={primaryButtonClass}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void reset()}
            disabled={busy}
            className={`${ghostButtonClass} hover:border-red-300 hover:text-red-600`}
          >
            Reset to original wording
          </button>
          <button
            type="button"
            onClick={() => saved && apply(saved)}
            disabled={busy || !dirty}
            className={ghostButtonClass}
          >
            Discard changes
          </button>
        </div>

        {note ? <p className="mt-3 text-xs font-semibold text-emerald-700">{note}</p> : null}
        {error ? <p className="mt-3 text-xs font-semibold text-red-600">{error}</p> : null}

        <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
          The bot decides <em>which</em> answer to use from what the guest asked — that routing is
          fixed. You control the words.
        </p>
      </section>

      {/* ---------- Who we are -------------------------------------- */}
      <section className={cardClass}>
        <label className={headingClass} htmlFor="bk-intro">
          Who you are and where you work
        </label>
        <p className={`mt-1 ${hintClass}`}>
          Opens every AI reply. It is also the answer when someone asks whether you cover their
          island, so name the places you actually work.
        </p>
        <textarea
          id="bk-intro"
          value={knowledge.intro}
          onChange={(event) => patch({ intro: event.target.value })}
          maxLength={MAX_INTRO_CHARS}
          rows={3}
          className={`mt-3 ${textAreaClass}`}
        />
      </section>

      {/* ---------- Warranty and terms ------------------------------ */}
      <section className={cardClass}>
        <h3 className={headingClass}>Warranty, monitoring and terms</h3>
        <p className={`mt-1 ${hintClass}`}>
          One line per condition. These are what the AI is told to stand behind, and the bot&apos;s
          warranty answer is built from them — so there is only one place to change a term.
        </p>

        <ul className="mt-4 space-y-3">
          {knowledge.warrantyTerms.map((term, index) => (
            <li key={index} className="flex flex-col gap-2 @xl:flex-row @xl:items-start">
              <textarea
                value={term}
                onChange={(event) => setClause(index, event.target.value)}
                rows={2}
                aria-label={`Warranty line ${index + 1}`}
                className={`${textAreaClass} @xl:flex-1`}
              />
              <button
                type="button"
                aria-label={`Remove warranty line ${index + 1}`}
                onClick={() =>
                  patch({ warrantyTerms: knowledge.warrantyTerms.filter((_, i) => i !== index) })
                }
                disabled={knowledge.warrantyTerms.length <= 1}
                className={`${iconButtonClass} self-end @xl:mt-1 @xl:self-start`}
              >
                <Icon name="Trash2" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => patch({ warrantyTerms: [...knowledge.warrantyTerms, ""] })}
          disabled={knowledge.warrantyTerms.length >= MAX_CLAUSES}
          className={`mt-3 ${ghostButtonClass}`}
        >
          Add a line
        </button>

        <div className="mt-5 rounded-xl bg-slate-50 p-3.5">
          <p className={labelClass}>The warranty answer the bot gives</p>
          <p className="mt-1.5 text-xs leading-relaxed break-words text-slate-600">
            {warrantyAnswer(knowledge)}
          </p>
          <p className={`mt-2 ${hintClass}`}>
            Built from the lines above, joined together. Blank lines are dropped when you save.
          </p>
        </div>
      </section>

      {/* ---------- The canned answers ------------------------------ */}
      <section className={cardClass}>
        <h3 className={headingClass}>What the bot says</h3>
        <p className={`mt-1 ${hintClass}`}>
          The answer for each kind of question. The AI uses these as its source, and they are also
          what gets sent word-for-word if the AI is ever unreachable. Keep prices pointed at the
          free site audit so a guide figure is never mistaken for a quote.
        </p>

        <div className="mt-4 space-y-4">
          {BOT_TOPICS.map((topic) => (
            <div key={topic.key} className="rounded-xl bg-slate-50 p-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <label className={labelClass} htmlFor={`bk-${topic.key}`}>
                  {topic.label}
                </label>
                <span className={hintClass}>{topic.hint}</span>
              </div>
              <textarea
                id={`bk-${topic.key}`}
                value={knowledge.answers[topic.key]}
                onChange={(event) => setAnswer(topic.key, event.target.value)}
                maxLength={MAX_ANSWER_CHARS}
                rows={4}
                className={`mt-2 ${textAreaClass} border-slate-200 bg-white`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Anything else ----------------------------------- */}
      <section className={cardClass}>
        <label className={headingClass} htmlFor="bk-extra">
          Anything else the bot must know
        </label>
        <p className={`mt-1 ${hintClass}`}>
          Free text, added on top of everything above. Use it for things that do not fit a box —
          a certification, something you no longer offer, a deposit rule. It is reference for the
          AI, so write facts rather than instructions.
        </p>
        <textarea
          id="bk-extra"
          value={knowledge.extraFacts}
          onChange={(event) => patch({ extraFacts: event.target.value })}
          maxLength={MAX_EXTRA_FACTS_CHARS}
          rows={5}
          placeholder="For example: we no longer install wind turbines. Or: we hold a DTI registration and can issue official receipts."
          className={`mt-3 ${textAreaClass}`}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={busy || !dirty} className={primaryButtonClass}>
          {busy ? "Saving…" : "Save"}
        </button>
        {dirty ? <span className={hintClass}>Unsaved changes</span> : null}
      </div>
    </div>
  );
}
