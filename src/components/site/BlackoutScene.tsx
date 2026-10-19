"use client";

import { usePrefersReducedMotion, useScrollProgress } from "@/lib/useScrollProgress";

type Phase = "grid" | "down" | "hybrid";

const PHASES: Array<{ key: Phase; label: string }> = [
  { key: "grid", label: "Grid online" },
  { key: "down", label: "Outage" },
  { key: "hybrid", label: "System takes over" },
];

/**
 * Scroll-driven blackout: the grid fails and the hybrid system carries the
 * load, driven by how far the scene has travelled through the viewport.
 */
export default function BlackoutScene() {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  const phase: Phase = reduced ? "hybrid" : progress < 0.3 ? "grid" : progress < 0.46 ? "down" : "hybrid";
  const lit = phase !== "down";
  const windowFill = phase === "grid" ? "#fff1c9" : phase === "hybrid" ? "#ffcf7a" : "#0c2f3a";
  const gridLive = phase === "grid";
  const solarLive = phase === "hybrid";

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[1.75rem] bg-navy-950 shadow-[0_30px_60px_-24px_rgba(4,20,25,0.55)] ring-1 ring-navy-900/10"
    >
      <svg viewBox="0 0 480 340" className="block w-full" role="img" aria-label="A resort loses grid power and its solar hybrid system takes over">
        <defs>
          <linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#041419" />
            <stop offset="1" stopColor="#12404d" />
          </linearGradient>
          <radialGradient id="bs-halo">
            <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="480" height="340" fill="url(#bs-sky)" />
        {[[40, 30], [120, 55], [210, 24], [300, 48], [380, 20], [440, 62], [90, 90], [260, 84]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.2" fill="white" opacity="0.55" />
        ))}
        <rect y="262" width="480" height="78" fill="#0a2b35" />
        <path d="M0 270 Q60 264 120 270 T240 270 T360 270 T480 270" stroke="white" strokeOpacity="0.1" fill="none" />

        {/* utility pole + wire */}
        <g>
          <rect x="56" y="118" width="6" height="150" fill="#1b5563" />
          <rect x="40" y="128" width="38" height="4" fill="#1b5563" />
          <circle cx="59" cy="112" r="5" fill={gridLive ? "#fff1c9" : "#12404d"} style={{ transition: "fill 0.3s" }} />
          {gridLive ? <circle cx="59" cy="112" r="26" fill="url(#bs-halo)" /> : null}
          <path
            d="M 59 130 Q 130 168 205 176"
            fill="none"
            stroke={gridLive ? "#fff1c9" : "#1b5563"}
            strokeWidth="1.6"
            strokeDasharray={gridLive ? "4 6" : undefined}
            style={{ transition: "stroke 0.3s" }}
          >
            {gridLive ? <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite" /> : null}
          </path>
          {phase === "down" ? (
            <g transform="translate(110 150)">
              <path d="M0 0 L8 -14 L5 -3 L13 -3 L2 14 L5 3 Z" fill="#ff6b5e" />
            </g>
          ) : null}
        </g>

        {/* building */}
        <rect x="205" y="176" width="200" height="94" fill="#0c2f3a" />
        <polygon points="195,176 305,122 415,176" fill="#12404d" />

        {/* solar array on roof slope */}
        <g>
          {[0, 1, 2].map((col) =>
            [0, 1].map((row) => {
              const x = 316 + col * 26 + row * -3;
              const y = 144 + row * 14 - col * 3;
              return (
                <polygon
                  key={`${col}-${row}`}
                  points={`${x},${y} ${x + 23},${y - 3} ${x + 20},${y + 11} ${x - 3},${y + 14}`}
                  fill={solarLive ? "#f8b445" : "#1b5563"}
                  stroke="#041419"
                  strokeWidth="1"
                  style={{ transition: "fill 0.6s" }}
                />
              );
            }),
          )}
        </g>

        {/* windows + door */}
        <g key={phase} className={phase === "down" && !reduced ? "animate-flicker" : ""}>
          <rect x="222" y="196" width="40" height="34" rx="3" fill={windowFill} />
          <rect x="348" y="196" width="40" height="34" rx="3" fill={windowFill} />
          <rect x="288" y="214" width="34" height="56" rx="3" fill={windowFill} />
        </g>
        {lit ? (
          <>
            <circle cx="242" cy="213" r="38" fill="url(#bs-halo)" opacity={solarLive ? 0.9 : 0.6} />
            <circle cx="368" cy="213" r="38" fill="url(#bs-halo)" opacity={solarLive ? 0.9 : 0.6} />
          </>
        ) : null}

        {/* battery */}
        <rect x="428" y="212" width="34" height="58" rx="4" fill="#0c2f3a" stroke="#1b5563" />
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x="434"
            y={218 + i * 12}
            width="22"
            height="8"
            rx="2"
            fill={solarLive ? "#f8b445" : phase === "grid" ? "#12404d" : "#1b5563"}
            style={{ transition: `fill 0.5s ${i * 0.08}s` }}
          />
        ))}
        <path d="M 405 240 H 428" stroke={solarLive ? "#f8b445" : "#1b5563"} strokeWidth="2" style={{ transition: "stroke 0.4s" }} />
        <path d="M 360 160 V 176" stroke={solarLive ? "#f8b445" : "#1b5563"} strokeWidth="2" style={{ transition: "stroke 0.4s" }} />
      </svg>

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-navy-950/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
        <span
          className={`h-2 w-2 rounded-full transition-colors duration-300 ${
            phase === "grid" ? "bg-emerald-400" : phase === "down" ? "bg-red-400" : "bg-solar-400"
          }`}
        />
        {phase === "grid" ? "Grid online" : phase === "down" ? "Grid down" : "Hybrid carrying the load"}
      </div>

      <ol className="grid grid-cols-3 gap-px border-t border-white/10 bg-white/10 text-center">
        {PHASES.map((item) => (
          <li
            key={item.key}
            className={`px-2 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 ${
              phase === item.key ? "bg-solar-400 text-navy-950" : "bg-navy-950 text-slate-400"
            }`}
          >
            {item.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
