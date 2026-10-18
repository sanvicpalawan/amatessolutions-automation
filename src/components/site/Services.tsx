import Link from "next/link";

import Reveal from "@/components/site/Reveal";
import { Icon } from "@/lib/icons";
import { SERVICE_STEPS, VERTICALS } from "@/lib/knowledge";
import { mediaSrc, type SiteContent } from "@/lib/site";

const STEP_ICONS: Record<string, string> = {
  consultation: "ClipboardList",
  delivery: "Boxes",
  installation: "HardHat",
  activation: "Zap",
  support: "Radio",
};

const VERTICAL_ICONS: Record<string, { icon: string; accent: string }> = {
  residential: { icon: "House", accent: "from-sky-400 to-sky-600" },
  commercial: { icon: "Building2", accent: "from-solar-300 to-solar-600" },
  industrial_marine: { icon: "Ship", accent: "from-teal-400 to-teal-600" },
  maintenance: { icon: "Wrench", accent: "from-violet-400 to-violet-600" },
};

export default function Services({ content }: { content: SiteContent }) {
  return (
    <section id="services-page" className="bg-white">
      {/* ---------- Hero ---------- */}
      <div className="relative isolate overflow-hidden bg-navy-950 pb-20 pt-32 sm:pt-40">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaSrc(content.servicesPageImage)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-40"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/85 via-navy-950/70 to-navy-950" />

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-solar-400/40 bg-solar-400/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-solar-300">
            <Icon name="Layers" className="h-3.5 w-3.5" strokeWidth={2.4} />
            {content.servicesPageEyebrow}
          </span>
          <h1 className="mt-6 text-hero font-extrabold uppercase tracking-tight text-white">
            {content.servicesPageTitle}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-slate-300 sm:text-base">
            {content.servicesPageSubtitle}
          </p>
        </div>
      </div>

      {/* ---------- 5-step delivery strip ---------- */}
      <div className="border-b border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ol className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2">
            {SERVICE_STEPS.map((step, index) => (
              <Reveal key={step.key} delay={index * 90} className="flex-1">
                <li className="group flex h-full list-none items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm relative transition-all duration-300 hover:-translate-y-1 hover:border-solar-300 hover:shadow-lg sm:items-center lg:flex-col lg:items-start lg:gap-3 lg:p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-all duration-300 group-hover:border-solar-300 group-hover:bg-solar-400 group-hover:text-navy-950">
                    <Icon name={STEP_ICONS[step.key] ?? "Zap"} className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight text-navy-900">{step.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 lg:mt-1.5">
                      {step.body}
                    </p>
                  </div>
                  {index < SERVICE_STEPS.length - 1 ? (
                    <Icon
                      name="ArrowRight"
                      aria-hidden
                      className="mx-auto mt-1 h-4 w-4 shrink-0 rotate-90 text-slate-300 lg:absolute lg:-right-3 lg:top-1/2 lg:mt-0 lg:rotate-0 lg:-translate-y-1/2"
                      strokeWidth={2.4}
                    />
                  ) : null}
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>

      {/* ---------- Trust section ---------- */}
      <div className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <Reveal>
              <h2 className="text-h2 font-extrabold uppercase tracking-tight text-navy-900">
                {content.trustHeadingLine1}
                <br />
                <span className="bg-gradient-to-r from-solar-500 to-solar-700 bg-clip-text text-transparent">
                  {content.trustHeadingLine2}
                </span>
              </h2>
              <p className="mt-6 text-[15px] leading-relaxed text-slate-600">
                {content.trustBody1}
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
                {content.trustBody2}
              </p>
              <Link
                href="/#quote"
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-navy-900 px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-navy-900/20 transition-all hover:-translate-y-0.5 hover:bg-navy-800"
              >
                {content.trustCta}
                <Icon
                  name="ArrowRight"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2.6}
                />
              </Link>
            </Reveal>

            <Reveal delay={120}>
              <div className="relative overflow-hidden rounded-3xl shadow-[0_30px_60px_-24px_rgba(11,22,38,0.3)] ring-1 ring-navy-900/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaSrc(content.trustImage)}
                  alt={content.trustHeadingLine1}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/40 to-transparent" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* ---------- Detailed service cards ---------- */}
      <div className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-h2 font-extrabold uppercase tracking-tight text-navy-900">
              {content.servicesDetailTitle}
            </h2>
          </Reveal>

          <div className="mt-14 space-y-6">
            {VERTICALS.map((vertical, index) => {
              const meta = VERTICAL_ICONS[vertical.key] ?? {
                icon: "Zap",
                accent: "from-solar-300 to-solar-600",
              };
              return (
                <Reveal key={vertical.key} delay={index * 80}>
                  <article className="group grid gap-6 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(11,22,38,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_24px_48px_-20px_rgba(11,22,38,0.18)] sm:p-8 md:grid-cols-[auto_1fr]">
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.accent} text-navy-950 shadow-lg shadow-navy-900/15 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                    >
                      <Icon name={meta.icon} className="h-6 w-6" strokeWidth={2.1} />
                    </span>

                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-navy-900">
                        {vertical.title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                        {vertical.blurb}
                      </p>

                      <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                        {vertical.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="flex items-start gap-2.5 text-sm text-navy-800"
                          >
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-solar-100 text-solar-700 transition-colors duration-300 group-hover:bg-solar-400 group-hover:text-navy-950">
                              <Icon name="Check" className="h-3 w-3" strokeWidth={3.2} />
                            </span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120}>
            <div className="mt-14 text-center">
              <Link
                href="/#quote"
                className="group inline-flex items-center gap-2 rounded-full bg-solar-400 px-8 py-4 text-xs font-bold uppercase tracking-wider text-navy-950 shadow-lg shadow-solar-500/25 transition-all hover:-translate-y-0.5 hover:bg-solar-300"
              >
                {content.quoteCta}
                <Icon
                  name="ArrowRight"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2.6}
                />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
