"use client";

import { useScrollProgress } from "@/lib/useScrollProgress";

/** Vertical timeline: a rail fills as you scroll and each step lights up when reached. */
export default function StepTimeline({ steps }: { steps: ReadonlyArray<{ id: number | string; title: string; body: string }> }) {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const fill = Math.min(1, Math.max(0, (progress - 0.2) / 0.5));
  const count = steps.length;

  return (
    <div ref={ref} className="relative pl-10 sm:pl-14">
      <div aria-hidden className="absolute bottom-6 left-[11px] top-6 w-px bg-white/10 sm:left-[15px]">
        <div className="h-full origin-top bg-gradient-to-b from-solar-300 to-solar-600 will-change-transform" style={{ transform: `scaleY(${fill})` }} />
      </div>

      <ol className="space-y-14 sm:space-y-20">
        {steps.map((step, index) => {
          const lit = fill >= (index + 0.15) / count;
          return (
            <li key={String(step.id)} className="relative list-none">
              <span
                aria-hidden
                className={`absolute -left-[39px] top-4 h-3 w-3 rounded-full border transition-all duration-500 sm:-left-[55px] ${
                  lit ? "scale-125 border-solar-300 bg-solar-400 shadow-[0_0_20px_5px_rgba(248,180,69,0.5)]" : "border-white/25 bg-navy-950"
                }`}
              />
              <div className={`transition-opacity duration-700 ${lit ? "opacity-100" : "opacity-35"}`}>
                <span
                  className={`font-display block text-6xl font-black leading-none tabular-nums transition-colors duration-700 sm:text-8xl ${
                    lit ? "text-solar-400" : "text-transparent"
                  }`}
                  style={lit ? undefined : { WebkitTextStroke: "1.5px rgba(255,255,255,0.28)" }}
                >
                  0{step.id}
                </span>
                <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">{step.title}</h3>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-300">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
