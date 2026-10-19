"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 0 → 1 as an element travels through the viewport (0 = its top edge enters
 * at the bottom, 1 = its bottom edge leaves at the top). rAF-throttled, no
 * layout thrash beyond one rect read per frame.
 */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const value = (vh - rect.top) / (rect.height + vh);
      setProgress(Math.min(1, Math.max(0, value)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return [ref, progress] as const;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    const id = window.setTimeout(sync, 0);
    query.addEventListener("change", sync);
    return () => {
      window.clearTimeout(id);
      query.removeEventListener("change", sync);
    };
  }, []);
  return reduced;
}
