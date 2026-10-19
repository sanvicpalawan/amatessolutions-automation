import CountUp from "@/components/site/CountUp";
import HeroSun from "@/components/site/HeroSun";
import Marquee from "@/components/site/Marquee";
import ParallaxImage from "@/components/site/ParallaxImage";
import SplitHeading from "@/components/site/SplitHeading";
import { Icon } from "@/lib/icons";
import { mediaSrc, type SiteContent } from "@/lib/site";

const COUNTABLE = /^\d+(\.\d+)?\s?[A-Za-z%]*$/;

export default function Hero({ content }: { content: SiteContent }) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950">
      <ParallaxImage src={mediaSrc(content.heroImage)} alt={content.heroTitleLine2} className="opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/75 to-navy-950/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-transparent to-navy-950/50" />

      <div className="pointer-events-none absolute inset-x-0 top-32 z-10 hidden min-[1360px]:block">
        <div className="mx-auto flex max-w-7xl justify-end px-8">
          <div className="animate-rise pointer-events-auto" style={{ animationDelay: "500ms" }}>
            <HeroSun />
          </div>
        </div>
      </div>

      <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-5 pb-12 pt-36 sm:px-8">
        <div className="animate-rise flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-solar-300">
          <span className="h-px w-10 bg-current" />
          {content.heroEyebrow}
          <span className="hidden text-slate-400 sm:inline">9.74°N · 118.74°E</span>
        </div>

        <SplitHeading
          as="h1"
          delay={150}
          className="mt-6 text-hero font-bold text-white"
          lines={[content.heroTitleLine1, { text: content.heroTitleLine2, accent: true }]}
          accentClassName="bg-gradient-to-r from-solar-200 via-solar-400 to-solar-600 bg-clip-text text-transparent"
        />

        <div className="animate-rise mt-9 grid gap-8 lg:grid-cols-12 lg:items-end" style={{ animationDelay: "600ms" }}>
          <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg lg:col-span-6">{content.heroSubtitle}</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:col-span-6 lg:justify-end">
            <a
              href="#quote"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-solar-400 px-8 py-4 text-sm font-bold uppercase tracking-wider text-navy-950 shadow-xl shadow-solar-500/25 transition hover:-translate-y-0.5 hover:bg-solar-300"
            >
              {content.heroCtaPrimary}
              <Icon name="ArrowRight" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.6} />
            </a>
            <a
              href="#process"
              className="group relative inline-flex items-center justify-center px-2 py-3 text-sm font-semibold uppercase tracking-wider text-white"
            >
              {content.heroCtaSecondary}
              <span className="absolute inset-x-2 bottom-2 h-px origin-left bg-solar-300 transition-transform duration-500 group-hover:scale-x-0" />
            </a>
          </div>
        </div>

        <dl className="mt-14 grid grid-cols-2 border-t border-white/15 sm:grid-cols-4">
          {content.heroStats.map((stat, index) => (
            <div key={stat.k} className={`py-6 pr-4 ${index > 0 ? "sm:border-l sm:border-white/10 sm:pl-6" : ""}`}>
              <dt className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {COUNTABLE.test(stat.k) ? <CountUp value={stat.k} onView duration={1400} /> : stat.k}
              </dt>
              <dd className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">{stat.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Marquee items={content.heroSubCities} className="relative border-t border-white/10 bg-navy-950/80 py-4 backdrop-blur" />
    </section>
  );
}
