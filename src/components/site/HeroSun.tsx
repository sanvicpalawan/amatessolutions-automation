"use client";

import { useEffect, useState } from "react";

const PEAK_KW = 7.3;
const CX = 180;
const CY = 176;
const R = 150;

function palawanDayFraction(now: Date) {
  // Palawan is UTC+8, no DST. Sun "up" from 06:00 to 18:00.
  const hours = ((now.getUTCHours() + 8) % 24) + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  return { hours, fraction: (hours - 6) / 12 };
}

/** Illustrative live meter: sun position follows Palawan's clock. Not real telemetry. */
export default function HeroSun() {
  const [state, setState] = useState({ fraction: 0.5, kw: 5.4, hours: 12 });

  useEffect(() => {
    const tick = () => {
      const { fraction, hours } = palawanDayFraction(new Date());
      const daylight = fraction > 0 && fraction < 1;
      const wobble = 0.965 + 0.035 * Math.sin(Date.now() / 1700);
      const kw = daylight ? PEAK_KW * Math.pow(Math.sin(Math.PI * fraction), 1.25) * wobble : 0;
      setState({ fraction, kw, hours });
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const daylight = state.fraction > 0 && state.fraction < 1;
  const f = Math.min(1, Math.max(0, state.fraction));
  const angle = Math.PI - Math.PI * f;
  const sx = CX + R * Math.cos(angle);
  const sy = CY - R * Math.sin(angle);
  const clock = `${String(Math.floor(state.hours)).padStart(2, "0")}:${String(Math.floor((state.hours % 1) * 60)).padStart(2, "0")}`;
  const arcLength = Math.PI * R;

  return (
    <div className="w-[340px] rounded-3xl border border-white/10 bg-navy-950/55 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Palawan · {clock}
        </span>
        <span>Simulated</span>
      </div>

      <svg viewBox="0 0 360 200" className="mt-3 w-full" role="img" aria-label="Sun position over Palawan with simulated solar output">
        <defs>
          <linearGradient id="hs-arc" x1="0" x2="1">
            <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.15" />
            <stop offset="0.5" stopColor="#f8b445" />
            <stop offset="1" stopColor="#ffcf7a" stopOpacity="0.15" />
          </linearGradient>
          <radialGradient id="hs-glow">
            <stop offset="0" stopColor="#ffcf7a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffcf7a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <line x1="14" x2="346" y1={CY} y2={CY} stroke="white" strokeOpacity="0.15" />
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="url(#hs-arc)"
          strokeWidth="2"
          strokeDasharray="3 7"
          strokeLinecap="round"
        />
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="#f8b445"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${arcLength * f} ${arcLength}`}
          opacity={daylight ? 0.9 : 0.25}
        />
        {daylight ? (
          <g style={{ transition: "transform 1s linear" }} transform={`translate(${sx} ${sy})`}>
            <circle r="34" fill="url(#hs-glow)" className="animate-sun" />
            <circle r="9" fill="#ffd98f" />
          </g>
        ) : (
          <g transform={`translate(${CX} ${CY - 70})`} opacity="0.9">
            <path d="M 8 -14 A 16 16 0 1 0 14 8 A 12 12 0 0 1 8 -14 Z" fill="#cfe3ea" />
          </g>
        )}
        <text x={CX - R} y={CY + 16} fill="white" fillOpacity="0.4" fontSize="10" textAnchor="middle">06:00</text>
        <text x={CX} y={CY + 16} fill="white" fillOpacity="0.4" fontSize="10" textAnchor="middle">12:00</text>
        <text x={CX + R} y={CY + 16} fill="white" fillOpacity="0.4" fontSize="10" textAnchor="middle">18:00</text>
      </svg>

      <div className="mt-1 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {daylight ? "Array output" : "Battery discharging"}
          </p>
          <p className="mt-1 text-4xl font-bold leading-none tabular-nums text-solar-300">
            {state.kw.toFixed(2)}
            <span className="ml-1 text-base font-semibold text-slate-400">kW</span>
          </p>
        </div>
        <p className="text-right text-[10px] leading-relaxed text-slate-500">
          {PEAK_KW} kWp reference array
          <br />
          marine-grade hybrid
        </p>
      </div>
    </div>
  );
}
