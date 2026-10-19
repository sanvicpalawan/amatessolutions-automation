import PowerFlowChart from "@/components/site/PowerFlowChart";
import Reveal from "@/components/site/Reveal";
import SectionLabel from "@/components/site/SectionLabel";
import SplitHeading from "@/components/site/SplitHeading";
import { Icon } from "@/lib/icons";
import type { SiteContent } from "@/lib/site";

export default function WhyAmates({ content }: { content: SiteContent }) {
  return (
    <section id="why" className="relative bg-[var(--brand-surface-muted)] py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel index="01">{content.whyEyebrow}</SectionLabel>
            <SplitHeading
              className="mt-6 text-h2 font-bold text-navy-900"
              lines={[content.whyTitle1, { text: content.whyTitle2, accent: true }]}
              accentClassName="bg-gradient-to-r from-solar-500 to-solar-700 bg-clip-text text-transparent"
            />
          </div>
          <Reveal delay={150} className="lg:col-span-4">
            <p className="text-[15px] leading-relaxed text-slate-600">{content.whyBody}</p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{content.whyHeading}</p>
            <div role="list" className="mt-4 border-t border-navy-900/15">
              {content.whyReasons.map((reason, index) => (
                <Reveal key={reason.title} delay={index * 70}>
                  <div
                    role="listitem"
                    className="group relative grid grid-cols-[3.25rem_1fr] gap-4 border-b border-navy-900/15 py-7 transition-[padding] duration-500 ease-out hover:pl-3 sm:grid-cols-[4.5rem_1fr]"
                  >
                    <span className="font-display text-2xl font-bold tabular-nums text-navy-900/25 transition-colors duration-500 group-hover:text-solar-600 sm:text-3xl">
                      0{index + 1}
                    </span>
                    <div>
                      <h4 className="text-xl font-semibold leading-snug tracking-tight text-navy-900 sm:text-2xl">{reason.title}</h4>
                      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">{reason.body}</p>
                    </div>
                    <span className="pointer-events-none absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-solar-500 transition-transform duration-700 ease-out group-hover:scale-x-100" />
                  </div>
                </Reveal>
              ))}
            </div>

            <a
              href="#quote"
              className="group mt-10 inline-flex items-center gap-2 rounded-full bg-navy-900 px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-navy-900/20 transition-all hover:-translate-y-0.5 hover:bg-navy-800"
            >
              {content.whyCta}
              <Icon name="ArrowRight" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
            </a>
          </div>

          <Reveal delay={120} from="right" className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
            <div className="relative">
              <PowerFlowChart />
              <div className="mt-4 w-full rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_36px_-14px_rgba(11,22,38,0.28)] backdrop-blur-md lg:absolute lg:-bottom-7 lg:right-4 lg:mt-0 lg:w-60">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-900">{content.whyBadgeTitle}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{content.whyBadgeBody}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
