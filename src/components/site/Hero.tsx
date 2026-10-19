import HeroSun from "@/components/site/HeroSun";
import { Icon } from "@/lib/icons";
import { mediaSrc, type SiteContent } from "@/lib/site";

export default function Hero({ content }: { content: SiteContent }) {
  return (
    <section className="relative isolate flex min-h-[94vh] items-center overflow-hidden bg-navy-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaSrc(content.heroImage)}
        alt={content.heroTitleLine2}
        className="absolute inset-0 h-full w-full object-cover opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/85 via-navy-950/70 to-navy-950" />
      <div className="absolute -right-24 top-24 h-72 w-72 animate-sun rounded-full bg-solar-400/25 blur-3xl" />

      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 hidden -translate-y-1/2 xl:block">
        <div className="mx-auto flex max-w-6xl justify-end px-8">
          <div className="animate-rise pointer-events-auto" style={{ animationDelay: "250ms" }}>
            <HeroSun />
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-36 sm:px-8 sm:pt-40">
        <div className="animate-rise max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-solar-400/40 bg-solar-400/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-solar-200">
            <span className="h-1.5 w-1.5 rounded-full bg-solar-300" />
            {content.heroEyebrow}
          </span>

          <h1 className="mt-6 text-hero font-extrabold uppercase tracking-tight text-white">
            {content.heroTitleLine1}
            <br />
            <span className="bg-gradient-to-r from-solar-200 via-solar-400 to-solar-600 bg-clip-text text-transparent">
              Solar Hybrid
            </span>
            <br />
            Systems
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {content.heroSubtitle}
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {content.heroSubCities.map((city) => (
              <span
                key={city}
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-200 backdrop-blur-sm"
              >
                {city}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#quote"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-solar-400 px-8 py-4 text-sm font-bold uppercase tracking-wider text-navy-950 shadow-xl shadow-solar-500/25 transition hover:-translate-y-0.5 hover:bg-solar-300"
            >
              {content.heroCtaPrimary}
              <Icon name="ArrowRight" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.6} />
            </a>
            <a
              href="#process"
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-8 py-4 text-sm font-semibold uppercase tracking-wider text-white transition hover:border-solar-300 hover:text-solar-300"
            >
              {content.heroCtaSecondary}
            </a>
          </div>
        </div>

        <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
          {content.heroStats.map((stat) => (
            <div key={stat.k} className="bg-navy-950/80 px-5 py-5 backdrop-blur">
              <dt className="text-xl font-bold text-solar-300 sm:text-2xl">{stat.k}</dt>
              <dd className="mt-1 text-[11px] uppercase tracking-wider text-slate-400">{stat.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
