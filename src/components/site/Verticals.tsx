import BentoCard from "@/components/site/BentoCard";
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

        <div className="mt-14 grid gap-5 lg:grid-cols-6">
          {VERTICALS.map((vertical, index) => {
            const meta = VERTICAL_ICONS[vertical.key] ?? {
              icon: "Zap",
              accent: "from-solar-300 to-solar-600",
            };
            // 4 / 2 over 2 / 4 — alternating wide and narrow tiles.
            const span = index % 4 === 0 || index % 4 === 3 ? "lg:col-span-4" : "lg:col-span-2";
            return (
              <Reveal key={vertical.key} delay={index * 90} from="scale" className={`${span} [&>article]:h-full`}>
                <BentoCard
                  title={vertical.title}
                  blurb={vertical.blurb}
                  bullets={vertical.bullets}
                  image={mediaSrc(content.servicesImages[vertical.key])}
                  icon={meta.icon}
                  accent={meta.accent}
                  className="h-full"
                />
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
