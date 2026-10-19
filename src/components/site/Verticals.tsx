import BentoCard from "@/components/site/BentoCard";
import Reveal from "@/components/site/Reveal";
import SectionLabel from "@/components/site/SectionLabel";
import SplitHeading from "@/components/site/SplitHeading";
import { VERTICALS } from "@/lib/knowledge";
import { mediaSrc, type SiteContent } from "@/lib/site";

import { VERTICAL_ICONS } from "@/lib/icon-names";

export default function Verticals({ content }: { content: SiteContent }) {
  return (
    <section id="services" className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel index="03">{content.servicesEyebrow}</SectionLabel>
            <SplitHeading className="mt-6 text-h2 font-bold text-navy-900" lines={[content.servicesTitle]} />
          </div>
          <Reveal delay={150} className="lg:col-span-4">
            <p className="text-[15px] leading-relaxed text-slate-600">{content.servicesBody}</p>
          </Reveal>
        </div>

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
