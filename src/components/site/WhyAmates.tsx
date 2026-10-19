import BlackoutScene from "@/components/site/BlackoutScene";
import Reveal from "@/components/site/Reveal";
import { Icon } from "@/lib/icons";
import type { SiteContent } from "@/lib/site";

export default function WhyAmates({ content }: { content: SiteContent }) {
  return (
    <section id="why" className="relative overflow-hidden bg-white py-20 sm:py-28">
      {/* soft ambient wash */}
      <div className="pointer-events-none absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-solar-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-0 h-80 w-80 rounded-full bg-sky-200/25 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <Reveal from="left">
            <span className="inline-flex items-center gap-2 rounded-full border border-solar-300/60 bg-solar-50 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-solar-700">
              <span className="h-1.5 w-1.5 rounded-full bg-solar-500" />
              {content.whyEyebrow}
            </span>

            <h2 className="mt-5 text-h2 font-extrabold uppercase tracking-tight text-navy-900">
              {content.whyTitle1}
              <br />
              <span className="bg-gradient-to-r from-solar-500 to-solar-700 bg-clip-text text-transparent">
                {content.whyTitle2}
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-600">
              {content.whyBody}
            </p>

            <div className="mt-10 flex items-center gap-3">
              <span className="h-px w-8 bg-gradient-to-r from-solar-500 to-transparent" />
              <h3 className="text-lg font-extrabold uppercase tracking-[0.12em] text-navy-900">
                {content.whyHeading}
              </h3>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {content.whyReasons.map((reason, index) => (
                <Reveal key={reason.title} delay={index * 80}>
                  <article className="group relative h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(11,22,38,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-[0_20px_40px_-16px_rgba(11,22,38,0.18)]">
                    {/* gradient ring on hover */}
                    <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-solar-400/0 via-solar-400/0 to-solar-400/0 opacity-0 transition-opacity duration-300 group-hover:from-solar-400/20 group-hover:via-transparent group-hover:to-sky-400/10 group-hover:opacity-100" />
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-solar-400 to-transparent transition-transform duration-500 group-hover:scale-x-100" />

                    <div className="relative flex items-start gap-4">
                      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-solar-400 to-solar-600 text-navy-950 shadow-lg shadow-solar-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]">
                        <Icon name={reason.icon} className="h-5 w-5" strokeWidth={2.1} />
                      </span>

                      <div className="min-w-0">
                        <h4 className="text-[15px] font-bold leading-snug tracking-tight text-navy-900">
                          {reason.title}
                        </h4>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                          {reason.body}
                        </p>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            <a
              href="#quote"
              className="group mt-9 inline-flex items-center gap-2 rounded-full bg-navy-900 px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-navy-900/20 transition-all hover:-translate-y-0.5 hover:bg-navy-800 hover:shadow-xl"
            >
              {content.whyCta}
              <Icon
                name="ArrowRight"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </a>
          </Reveal>

          <Reveal delay={120} from="right" className="lg:sticky lg:top-28 lg:pl-6">
            <div className="relative">
              {/* offset accent frame */}
              <div className="absolute -left-5 -top-5 h-32 w-32 rounded-[1.75rem] border-2 border-solar-400/50" />
              <div className="absolute -bottom-6 -right-4 h-24 w-24 rounded-full bg-gradient-to-br from-solar-300/30 to-transparent blur-xl" />

              <BlackoutScene />

              {/* status card: static on mobile (avoids colliding with the
                  section below), floating from lg up */}
              <div className="mt-4 w-full rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_36px_-14px_rgba(11,22,38,0.28)] backdrop-blur-md lg:absolute lg:-bottom-7 lg:left-4 lg:mt-0 lg:w-60 lg:-right-6 lg:left-auto">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-900">
                    {content.whyBadgeTitle}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {content.whyBadgeBody}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
