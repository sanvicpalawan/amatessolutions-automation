import Link from "next/link";

import Reveal from "@/components/site/Reveal";
import { Icon } from "@/lib/icons";
import { VERTICALS } from "@/lib/knowledge";
import { mediaSrc, type SiteContent } from "@/lib/site";

import { VERTICAL_ICONS } from "@/lib/icon-names";

export default function Verticals({ content }: { content: SiteContent }) {
  return (
    <section id="services" className="relative bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-solar-300/60 bg-solar-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-solar-700">
            <Icon name="Layers" className="h-3.5 w-3.5" strokeWidth={2.4} />
            {content.servicesEyebrow}
          </span>
          <h2 className="mt-5 text-h2 font-extrabold uppercase tracking-tight text-navy-900">
            {content.servicesTitle}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{content.servicesBody}</p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {VERTICALS.map((vertical, index) => {
            const meta = VERTICAL_ICONS[vertical.key] ?? {
              icon: "Zap",
              accent: "from-solar-300 to-solar-600",
            };
            return (
              <Reveal key={vertical.key} delay={index * 90}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(11,22,38,0.04)] transition-all duration-300 hover:-translate-y-2 hover:border-transparent hover:shadow-[0_28px_56px_-20px_rgba(11,22,38,0.22)]">
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaSrc(content.servicesImages[vertical.key])}
                      alt={vertical.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/25 to-transparent" />

                    {/* floating icon chip */}
                    <span
                      className={`absolute bottom-4 left-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} text-navy-950 shadow-lg shadow-navy-900/25 ring-1 ring-white/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                    >
                      <Icon name={meta.icon} className="h-5 w-5" strokeWidth={2.1} />
                    </span>

                    <h3 className="absolute bottom-5 right-5 max-w-[60%] text-right text-lg font-bold leading-snug tracking-tight text-white">
                      {vertical.title}
                    </h3>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-sm leading-relaxed text-slate-600">{vertical.blurb}</p>
                    <ul className="mt-5 space-y-2.5">
                      {vertical.bullets.slice(0, 4).map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3 text-sm text-navy-800">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-solar-100 text-solar-700 transition-colors duration-300 group-hover:bg-solar-400 group-hover:text-navy-950">
                            <Icon name="Check" className="h-3 w-3" strokeWidth={3.2} />
                          </span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6">
                      <Link
                        href="/services"
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-navy-900 transition-all duration-300 hover:gap-3"
                      >
                        Full service details
                        <Icon name="ArrowUpRight" className="h-3.5 w-3.5" strokeWidth={3} />
                      </Link>
                      <a
                        href="/#quote"
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-solar-700 transition-all duration-300 hover:gap-3"
                      >
                        Request a quote
                        <Icon name="ArrowUpRight" className="h-3.5 w-3.5" strokeWidth={3} />
                      </a>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
