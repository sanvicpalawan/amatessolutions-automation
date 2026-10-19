import Reveal from "@/components/site/Reveal";
import SectionLabel from "@/components/site/SectionLabel";
import SplitHeading from "@/components/site/SplitHeading";
import StepTimeline from "@/components/site/StepTimeline";
import { Icon } from "@/lib/icons";
import { STEPS } from "@/lib/knowledge";
import { mediaSrc, type SiteContent } from "@/lib/site";

export default function StepFramework({ content }: { content: SiteContent }) {
  return (
    <section id="process" className="relative overflow-hidden bg-navy-950 py-24 sm:py-32">
      <div className="absolute inset-0 opacity-15">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaSrc(content.processBgImage)} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-950/90 to-navy-950" />
      <div className="pointer-events-none absolute -left-40 top-20 h-96 w-96 rounded-full bg-solar-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-12">
        <div className="lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
          <SectionLabel index="02" tone="dark">
            {content.processEyebrow}
          </SectionLabel>
          <SplitHeading className="mt-6 text-h2 font-bold text-white" lines={[content.processTitle]} />
          <Reveal delay={150}>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-300">{content.processBody}</p>

            <div className="mt-10 border-l-2 border-solar-400/60 pl-5">
              <p className="max-w-md text-xs leading-relaxed text-slate-400">
                <strong className="text-solar-200">Free lifetime remote monitoring</strong> {content.processNote}
              </p>
              <a
                href="#quote"
                className="group mt-5 inline-flex items-center gap-2 rounded-full bg-solar-400 px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-navy-950 shadow-lg shadow-solar-500/25 transition-all hover:-translate-y-0.5 hover:bg-solar-300"
              >
                {content.processNoteCta}
                <Icon name="ArrowRight" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.6} />
              </a>
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <StepTimeline steps={STEPS.map((step) => ({ id: step.id, title: step.title, body: step.body }))} />
        </div>
      </div>
    </section>
  );
}
