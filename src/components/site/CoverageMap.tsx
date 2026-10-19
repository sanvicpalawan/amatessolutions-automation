"use client";

import { useState } from "react";

import Reveal from "@/components/site/Reveal";
import SectionLabel from "@/components/site/SectionLabel";
import SplitHeading from "@/components/site/SplitHeading";
import { PALAWAN_PATH, PALAWAN_TOWNS } from "@/lib/palawan-geo";

/** Palawan service-area map. Dots mark where Amates works, not individual installs. */
export default function CoverageMap({
  towns,
  featured,
  featuredNote,
}: {
  towns: string[];
  featured: string;
  featuredNote: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  // Balabac (far south) is an emerging destination, so it always appears on the map.
  const places = Array.from(new Set([...towns, "Balabac"])).filter((town) => PALAWAN_TOWNS[town]);

  return (
    <section id="coverage" className="relative overflow-hidden bg-navy-950 py-24 sm:py-32">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-solar-500/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
        <Reveal from="left">
          <SectionLabel index="04" tone="dark">
            Coverage
          </SectionLabel>
          <SplitHeading
            className="mt-6 text-h2 font-bold text-white"
            lines={["From Puerto Princesa", { text: "to the far islands", accent: true }]}
          />
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">
            Our crews work across the archipelago, so remote sites get the same marine-grade install and
            remote monitoring as the city.
          </p>

          <ul className="mt-8 grid gap-2 sm:grid-cols-2">
            {places.map((town) => (
              <li key={town}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(town)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(town)}
                  onBlur={() => setActive(null)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all duration-300 ${
                    active === town
                      ? "border-solar-400/60 bg-solar-400/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-300"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full transition-colors ${active === town ? "bg-solar-400" : "bg-slate-500"}`}
                  />
                  {town}
                  {town === featured || town === "Balabac" ? (
                    <span className="ml-auto rounded-full bg-solar-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-navy-950">
                      {town === featured ? "Featured" : "Emerging"}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          {featuredNote ? <p className="mt-5 text-xs text-slate-400">{featured}: {featuredNote}</p> : null}
        </Reveal>

        <Reveal from="right">
          <svg
            viewBox="0 0 320 430"
            className="mx-auto block w-full max-w-sm"
            role="img"
            aria-label="Map of Palawan with Amates service areas"
          >
            <path d={PALAWAN_PATH} fill="#12404d" stroke="#12404d" strokeWidth="0.6" strokeLinejoin="round" />
            {places.map((town, index) => {
              const [x, y] = PALAWAN_TOWNS[town];
              const on = active === town || town === featured;
              const labelRight = x < 240;
              return (
                <g key={town}>
                  <circle
                    className="map-ring"
                    cx={x}
                    cy={y}
                    r="5"
                    fill="#f8b445"
                    style={{ animationDelay: `${index * 0.45}s` }}
                  />
                  <circle cx={x} cy={y} r={active === town ? 5.5 : 4} fill={on ? "#ffcf7a" : "#f2a12c"} style={{ transition: "r 0.2s" }} />
                  <text
                    x={labelRight ? x + 9 : x - 9}
                    y={y + 3}
                    textAnchor={labelRight ? "start" : "end"}
                    fontSize="9.5"
                    fontWeight="600"
                    fill="white"
                    fillOpacity={active === town ? 1 : 0.7}
                  >
                    {town}
                  </text>
                </g>
              );
            })}
          </svg>
        </Reveal>
      </div>
    </section>
  );
}
