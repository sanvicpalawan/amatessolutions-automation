"use client";

import { useEffect, useRef, useState } from "react";

const PATTERN = /^(\D*?)(\d[\d,]*(?:\.\d+)?)([\s\S]*)$/;

function parse(value: string) {
  const match = value.match(PATTERN);
  if (!match) return null;
  const [, prefix, raw, suffix] = match;
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return {
    prefix,
    suffix,
    decimals,
    commas: raw.includes(","),
    target: Number(raw.replace(/,/g, "")),
  };
}

function render(n: number, p: NonNullable<ReturnType<typeof parse>>) {
  const body = p.commas
    ? n.toLocaleString("en-US", { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals })
    : n.toFixed(p.decimals);
  return `${p.prefix}${body}${p.suffix}`;
}

/**
 * Tweens the first number in a formatted string ("PHP 12,400", "7.3 kWp").
 * `onView` waits until the element scrolls into view and counts up from zero;
 * otherwise it animates from the previous value whenever `value` changes.
 */
export default function CountUp({
  value,
  onView = false,
  duration = 1100,
  className,
}: {
  value: string;
  onView?: boolean;
  duration?: number;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLSpanElement | null>(null);
  const current = useRef<number | null>(null);
  const armed = useRef(!onView);

  useEffect(() => {
    const parsed = parse(value);
    if (!parsed) {
      const id = window.setTimeout(() => setText(value), 0);
      return () => window.clearTimeout(id);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let observer: IntersectionObserver | null = null;

    const run = () => {
      const from = current.current ?? 0;
      const to = parsed.target;
      if (reduced || from === to) {
        current.current = to;
        setText(value);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const n = from + (to - from) * eased;
        current.current = n;
        setText(render(n, parsed));
        if (t < 1) frame = requestAnimationFrame(step);
        else {
          current.current = to;
          setText(value);
        }
      };
      frame = requestAnimationFrame(step);
    };

    if (!armed.current && ref.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            armed.current = true;
            observer?.disconnect();
            run();
          }
        },
        { threshold: 0.4 },
      );
      observer.observe(ref.current);
    } else {
      run();
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {text}
    </span>
  );
}
