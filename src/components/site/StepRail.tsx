"use client";

import type { ReactNode } from "react";

import { useScrollProgress } from "@/lib/useScrollProgress";

/** A line that draws itself through the four steps as the section scrolls past. */
export default function StepRail({ children, steps = 4 }: { children: ReactNode; steps?: number }) {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const fill = Math.min(1, Math.max(0, (progress - 0.3) / 0.35));

  return (
    <div ref={ref} className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 hidden h-px lg:block">
        <div className="absolute inset-0 bg-white/10" />
        <div
          className="absolute inset-0 origin-left bg-gradient-to-r from-solar-300 via-solar-400 to-solar-600 will-change-transform"
          style={{ transform: `scaleX(${fill})` }}
        />
        {Array.from({ length: steps }).map((_, i) => {
          const at = (i + 0.5) / steps;
          const lit = fill >= at - 0.02;
          return (
            <span
              key={i}
              className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-500 ${
                lit
                  ? "scale-110 border-solar-300 bg-solar-400 shadow-[0_0_18px_4px_rgba(248,180,69,0.55)]"
                  : "border-white/25 bg-navy-950"
              }`}
              style={{ left: `${at * 100}%` }}
            />
          );
        })}
      </div>
      {children}
    </div>
  );
}
