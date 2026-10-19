import Reveal from "@/components/site/Reveal";
import StepRail from "@/components/site/StepRail";
import { Icon } from "@/lib/icons";
import { STEP_ICONS } from "@/lib/icon-names";
import { STEPS } from "@/lib/knowledge";
import { mediaSrc, type SiteContent } from "@/lib/site";

export default function StepFramework({ content }: { content: SiteContent }) {
  return (
    <section id="process" className="relative overflow-hidden bg-navy-950 py-20 sm:py-28">
      <div className="absolute inset-0 opacity-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaSrc(content.processBgImage)}
          alt={content.processTitle}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950 via-navy-950/95 to-navy-950" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-solar-500/12 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-solar-400/40 bg-solar-400/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-solar-300">
            <Icon name="Sparkles" className="h-3.5 w-3.5" strokeWidth={2.4} />
            {content.processEyebrow}
          </span>
          <h2 className="mt-5 text-h2 font-extrabold uppercase tracking-tight text-white">
            {content.processTitle}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-300">{content.processBody}</p>
        </Reveal>

        <StepRail>
        <ol className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.key} delay={index * 110}>
              <li className="group relative h-full list-none overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:border-solar-400/50 hover:bg-white/[0.07]">
                {/* hover glow */}
                <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-solar-400/0 blur-2xl transition-all duration-500 group-hover:bg-solar-400/25" />
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-solar-400 to-transparent transition-transform duration-500 group-hover:scale-x-100" />

                <div className="relative flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-solar-300 to-solar-600 text-navy-950 shadow-lg shadow-solar-600/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-8deg]">
                    <Icon name={STEP_ICONS[step.key] ?? "Zap"} className="h-5.5 w-5.5" strokeWidth={2.1} />
                  </span>
                  <span className="text-4xl font-black leading-none text-white/8 transition-colors duration-300 group-hover:text-solar-400/25">
                    0{step.id}
                  </span>
                </div>

                <h3 className="relative mt-5 text-base font-bold leading-snug tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-300">{step.body}</p>

                <span className="relative mt-5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-solar-400/0 transition-colors duration-300 group-hover:text-solar-300">
                  Step {step.id}
                  <Icon name="ArrowRight" className="h-3 w-3" strokeWidth={3} />
                </span>
              </li>
            </Reveal>
          ))}
        </ol>
        </StepRail>

        <Reveal delay={140}>
          <div className="mt-12 flex flex-col gap-6 rounded-2xl border border-solar-400/25 bg-solar-400/[0.07] p-6 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-xs leading-relaxed text-slate-300">
              <strong className="text-solar-200">Free lifetime remote monitoring</strong>{" "}
              {content.processNote}
            </p>
            <a
              href="#quote"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-solar-400 px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-navy-950 shadow-lg shadow-solar-500/25 transition-all hover:-translate-y-0.5 hover:bg-solar-300"
            >
              {content.processNoteCta}
              <Icon
                name="ArrowRight"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                strokeWidth={2.5}
              />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
