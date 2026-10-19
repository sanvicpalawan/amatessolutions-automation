"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/lib/icons";
import { useScrollProgress } from "@/lib/useScrollProgress";

/**
 * Bento tile: full-bleed photo with a gentle scroll parallax. On hover-capable
 * devices the checklist slides open; on touch it is always visible.
 */
export default function BentoCard({
  title,
  blurb,
  bullets,
  image,
  icon,
  accent,
  className = "",
  children,
}: {
  title: string;
  blurb: string;
  bullets: readonly string[];
  image: string;
  icon: string;
  accent: string;
  className?: string;
  children?: ReactNode;
}) {
  const [ref, progress] = useScrollProgress<HTMLElement>();
  const shift = (progress - 0.5) * -56;

  return (
    <article
      ref={ref}
      tabIndex={0}
      className={`group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-3xl bg-navy-950 outline-offset-4 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={title}
        loading="lazy"
        className="absolute inset-x-0 -top-8 -z-20 h-[calc(100%+4rem)] w-full object-cover transition-[filter] duration-700 group-hover:brightness-110"
        style={{ transform: `translate3d(0, ${shift}px, 0) scale(1.08)` }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-950 via-navy-950/60 to-navy-950/10 transition-opacity duration-500" />
      <div className="absolute inset-0 -z-10 bg-navy-950/0 transition-colors duration-500 group-hover:bg-navy-950/25 group-focus-within:bg-navy-950/25" />

      <div className="p-6 sm:p-7">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-navy-950 shadow-lg ring-1 ring-white/25 transition-transform duration-500 group-hover:-translate-y-1 group-hover:-rotate-6`}
        >
          <Icon name={icon} className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <h3 className="mt-4 max-w-md text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">{blurb}</p>

        <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out hover:grid-rows-[1fr] [@media(hover:hover)]:grid-rows-[0fr] [@media(hover:hover)]:group-focus-within:grid-rows-[1fr] [@media(hover:hover)]:group-hover:grid-rows-[1fr]">
          <div className="overflow-hidden">
            <ul className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {bullets.slice(0, 4).map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5 text-[13px] text-slate-200">
                  <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-solar-400 text-navy-950">
                    <Icon name="Check" className="h-3 w-3" strokeWidth={3.2} />
                  </span>
                  {bullet}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link
                href="/services"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:gap-3"
              >
                Full service details
                <Icon name="ArrowUpRight" className="h-3.5 w-3.5" strokeWidth={3} />
              </Link>
              <Link
                href="/#quote"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-solar-300 transition-all hover:gap-3"
              >
                Request a quote
                <Icon name="ArrowUpRight" className="h-3.5 w-3.5" strokeWidth={3} />
              </Link>
            </div>
          </div>
        </div>
        {children}
      </div>
    </article>
  );
}
