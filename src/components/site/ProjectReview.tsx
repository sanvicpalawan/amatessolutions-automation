import CountUp from "@/components/site/CountUp";
import Reveal from "@/components/site/Reveal";
import SectionLabel from "@/components/site/SectionLabel";
import SplitHeading from "@/components/site/SplitHeading";
import { Icon } from "@/lib/icons";
import { mediaSrc, type SiteContent } from "@/lib/site";

export default function ProjectReview({ content }: { content: SiteContent }) {
  return (
    <section id="review" className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <SectionLabel index="05">{content.reviewEyebrow}</SectionLabel>
            <SplitHeading className="mt-6 text-h2 font-bold text-navy-900" lines={[content.reviewTitle]} />
          </div>
          <Reveal delay={150} className="lg:col-span-4">
            <p className="text-[15px] leading-relaxed text-slate-600">{content.reviewSubtitle}</p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <Reveal from="left" className="lg:col-span-5">
            <div className="group relative overflow-hidden rounded-[2rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc(content.reviewImage)}
                alt={content.reviewTitle}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <span className="inline-flex rounded-full bg-solar-400 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-navy-950">
                  {content.reviewBadge}
                </span>
                <h3 className="mt-3 text-xl font-semibold text-white">{content.reviewSiteName}</h3>
                <p className="mt-1 text-sm text-slate-300">{content.reviewMeta}</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} className="flex flex-col justify-center lg:col-span-7">
            <Icon name="Quote" className="h-10 w-10 text-solar-500" strokeWidth={1.5} />
            <blockquote className="font-display mt-6 space-y-5 text-2xl font-medium leading-snug tracking-tight text-navy-900 sm:text-3xl">
              <p>&ldquo;{content.reviewQuote1}</p>
              <p>{content.reviewQuote2}&rdquo;</p>
            </blockquote>
            <p className="mt-8 flex items-center gap-3 text-sm font-semibold text-navy-900">
              <span className="h-px w-10 bg-solar-500" />
              {content.reviewAuthor}
              <span className="font-normal text-slate-500">{content.reviewAuthorMeta}</span>
            </p>
          </Reveal>
        </div>

        <dl className="mt-16 grid grid-cols-2 border-t border-navy-900/15 sm:grid-cols-4">
          {content.reviewSpecs.map((spec, index) => (
            <div key={spec.label} className={`py-7 pr-4 ${index > 0 ? "sm:border-l sm:border-navy-900/10 sm:pl-6" : ""}`}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{spec.label}</dt>
              <dd className="font-display mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
                <CountUp value={spec.value} onView />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
