"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Delete, LogIn } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export default function PasskeyForm({
  length,
  locked,
  retryAfterSeconds,
  attemptsLeft,
}: {
  length: number;
  locked: boolean;
  retryAfterSeconds: number;
  attemptsLeft: number;
}) {
  const router = useRouter();
  const [digits, setDigits] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [countdown, setCountdown] = useState(retryAfterSeconds);
  const submitting = useRef(false);

  /* live lockout countdown */
  useEffect(() => {
    if (!locked) return;
    setCountdown(retryAfterSeconds);
    const timer = setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          clearInterval(timer);
          window.location.reload();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [locked, retryAfterSeconds]);

  const submit = useCallback(
    async (value: string) => {
      if (submitting.current) return;
      submitting.current = true;
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ passkey: value }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(payload.error ?? "Could not sign in.");
          setShake(true);
          window.setTimeout(() => setShake(false), 500);
          setDigits("");
          return;
        }
        router.replace("/admin");
        router.refresh();
      } catch {
        setError("Network error. Please retry.");
        setDigits("");
      } finally {
        submitting.current = false;
        setBusy(false);
      }
    },
    [router],
  );

  /* auto-submit once the last digit is entered */
  useEffect(() => {
    if (digits.length === length && !busy && !locked) {
      void submit(digits);
    }
  }, [digits, length, busy, locked, submit]);

  /* physical keyboard support */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (locked || busy) return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        setDigits((prev) => (prev.length < length ? prev + event.key : prev));
      } else if (event.key === "Backspace") {
        event.preventDefault();
        setDigits((prev) => prev.slice(0, -1));
      } else if (event.key === "Escape") {
        setDigits("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locked, busy, length]);

  function press(key: string) {
    if (locked || busy) return;
    setError("");
    if (key === "clear") {
      setDigits("");
      return;
    }
    if (key === "back") {
      setDigits((prev) => prev.slice(0, -1));
      return;
    }
    setDigits((prev) => (prev.length < length ? prev + key : prev));
  }

  return (
    <div className="w-full max-w-sm">
      {/* PIN dots */}
      <div
        className={`flex justify-center gap-3.5 ${shake ? "animate-[amates-shake_0.4s]" : ""}`}
        aria-hidden
      >
        {Array.from({ length }).map((_, index) => (
          <span
            key={index}
            className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
              index < digits.length
                ? "scale-110 bg-solar-400 shadow-lg shadow-solar-500/40"
                : "bg-white/15"
            }`}
          />
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {locked
          ? `Locked — retry in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}`
          : `${length}-digit passkey`}
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-500/10 px-4 py-2.5 text-center text-xs text-red-300"
        >
          {error}
        </p>
      ) : null}

      {!locked && attemptsLeft <= 2 && attemptsLeft > 0 ? (
        <p className="mt-3 text-center text-[11px] text-amber-300/80">
          {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left before a 15-minute lockout.
        </p>
      ) : null}

      {/* Keypad */}
      <div className="mt-7 grid grid-cols-3 gap-3">
        {KEYS.map((key) => {
          const isAction = key === "clear" || key === "back";
          return (
            <button
              key={key}
              type="button"
              disabled={locked || busy}
              onClick={() => press(key)}
              aria-label={key === "back" ? "Delete last digit" : key === "clear" ? "Clear" : key}
              className={`flex h-14 items-center justify-center rounded-2xl text-lg font-bold transition-all duration-150 active:scale-95 disabled:opacity-40 ${
                isAction
                  ? "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  : "border border-white/10 bg-white/[0.07] text-white hover:border-solar-400/50 hover:bg-solar-400/15 hover:text-solar-200"
              }`}
            >
              {key === "back" ? (
                <Delete className="h-5 w-5" strokeWidth={2} />
              ) : key === "clear" ? (
                <span className="text-[11px] uppercase tracking-wider">Clear</span>
              ) : (
                key
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={locked || busy || digits.length !== length}
        onClick={() => void submit(digits)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-solar-400 px-6 py-4 text-xs font-bold uppercase tracking-wider text-navy-950 shadow-lg shadow-solar-500/25 transition-all hover:-translate-y-0.5 hover:bg-solar-300 disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
      >
        <LogIn className="h-4 w-4" strokeWidth={2.4} />
        {busy ? "Checking…" : "Enter backoffice"}
      </button>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-500">
        You can also type the passkey on your keyboard.
        <br />
        Set it in <code className="rounded bg-white/10 px-1">.env</code> as{" "}
        <code className="rounded bg-white/10 px-1">ADMIN_PASSKEY</code>.
      </p>
    </div>
  );
}
