"use client";

import { useEffect, useRef } from "react";

/** Thin amber bar across the top that fills as the page is read. */
export default function ScrollProgress() {
  const bar = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${value})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
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

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]">
      <div ref={bar} className="h-full origin-left scale-x-0 bg-gradient-to-r from-solar-300 via-solar-400 to-solar-600 will-change-transform" />
    </div>
  );
}
