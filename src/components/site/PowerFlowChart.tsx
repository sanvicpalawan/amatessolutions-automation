"use client";

import { usePrefersReducedMotion, useScrollProgress } from "@/lib/useScrollProgress";

const X0 = 40;
const X1 = 500;
const BASE = 176;
const OUTAGE = 262;
const LOAD =
  "M40 78 C 90 70 130 86 180 76 S 250 66 300 76 S 380 88 430 76 S 480 70 500 76";

/**
 * Restrained "energy dashboard" visual: site load stays flat while supply
 * switches from grid to the hybrid system. Revealed left→right on scroll.
 */
export default function PowerFlowChart() {
  const [ref, progress] = useScrollProgress<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const fill = reduced ? 1 : Math.min(1, Math.max(0, (progress - 0.16) / 0.42));
  const edge = X0 + fill * (X1 - X0);
  const pastOutage = edge > OUTAGE + 6;
  const takenOver = edge > OUTAGE + 70;

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[1.75rem] bg-navy-950 p-6 pb-16 shadow-[0_30px_60px_-28px_rgba(4,20,25,0.6)] ring-1 ring-navy-900/20 sm:p-8 sm:pb-16"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-solar-400">Grid outage, in practice</p>
          <h3 className="mt-2 text-lg font-bold leading-snug text-white sm:text-xl">The load never drops.</h3>
        </div>
        <span className="shrink-0 rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Illustrative
        </span>
      </div>

      <svg viewBox="0 0 520 220" className="mt-6 block w-full" role="img" aria-label="Site load stays constant while supply switches from the grid to the hybrid system during an outage">
        <defs>
          <linearGradient id="pf-hybrid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8b445" stopOpacity="0.7" />
            <stop offset="1" stopColor="#f8b445" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="pf-grid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#94a3b8" stopOpacity="0.38" />
            <stop offset="1" stopColor="#94a3b8" stopOpacity="0.04" />
          </linearGradient>
          <clipPath id="pf-reveal">
            <rect x={X0} y="0" width={Math.max(0, edge - X0)} height="220" />
          </clipPath>
          <clipPath id="pf-before">
            <rect x={X0} y="0" width={OUTAGE - X0} height="220" />
          </clipPath>
          <clipPath id="pf-after">
            <rect x={OUTAGE} y="0" width={X1 - OUTAGE} height="220" />
          </clipPath>
        </defs>

        {[0, 1, 2].map((i) => (
          <line key={i} x1={X0} x2={X1} y1={BASE - i * 50} y2={BASE - i * 50} stroke="white" strokeOpacity="0.08" />
        ))}
        <text x={X0} y={BASE + 22} fontSize="10" fill="white" fillOpacity="0.4">Time</text>
        <text x={X0} y="22" fontSize="10" fill="white" fillOpacity="0.4">Site load</text>

        <g clipPath="url(#pf-reveal)">
          <g clipPath="url(#pf-before)">
            <path d={`${LOAD} L${X1} ${BASE} L${X0} ${BASE} Z`} fill="url(#pf-grid)" />
          </g>
          <g clipPath="url(#pf-after)">
            <path d={`${LOAD} L${X1} ${BASE} L${X0} ${BASE} Z`} fill="url(#pf-hybrid)" />
          </g>
          <path d={LOAD} fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* outage marker */}
        <g style={{ opacity: pastOutage ? 1 : 0, transition: "opacity 0.4s" }}>
          <line x1={OUTAGE} x2={OUTAGE} y1="34" y2={BASE} stroke="#f87171" strokeWidth="1.2" strokeDasharray="3 4" />
          <rect x={OUTAGE - 42} y="34" width="84" height="20" rx="10" fill="#7f1d1d" fillOpacity="0.85" />
          <text x={OUTAGE} y="48" fontSize="10" fontWeight="700" textAnchor="middle" fill="#fecaca">GRID OUTAGE</text>
        </g>
        <g style={{ opacity: takenOver ? 1 : 0, transition: "opacity 0.5s" }}>
          <rect x="344" y="108" width="132" height="22" rx="11" fill="#f8b445" />
          <text x="410" y="123" fontSize="10" fontWeight="800" textAnchor="middle" fill="#041419">HYBRID CARRIES LOAD</text>
        </g>

        {/* scan edge */}
        {fill > 0 && fill < 1 ? <line x1={edge} x2={edge} y1="30" y2={BASE} stroke="white" strokeOpacity="0.35" /> : null}
      </svg>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-medium text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-400/60" /> Grid supply
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-solar-400" /> Solar + battery
        </span>
      </div>
    </div>
  );
}
