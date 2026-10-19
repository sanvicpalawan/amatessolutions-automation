import CountUp from "@/components/site/CountUp";
import Reveal from "@/components/site/Reveal";
import { Icon } from "@/lib/icons";
import { mediaSrc, type SiteContent } from "@/lib/site";


export default function ProjectReview({ content }: { content: SiteContent }) {
  return (
    <section id="review" className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-solar-600">
            {content.reviewEyebrow}
          </span>
          <h2 className="mt-4 text-3xl font-extrabold uppercase tracking-tight text-navy-900 sm:text-4xl">
            {content.reviewTitle}
          </h2>
          <p className="mt-4 text-[15px] text-slate-600">{content.reviewSubtitle}</p>
        </Reveal>

        <div className="mt-12 grid items-stretch gap-8 lg:grid-cols-[1.05fr_1fr]">
          <Reveal from="left">
            <div className="group relative h-full overflow-hidden rounded-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc(content.reviewImage)}
                alt={content.reviewTitle}
                loading="lazy"
                className="h-full min-h-[320px] w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <span className="inline-flex items-center gap-2 rounded-full bg-solar-400 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-navy-950">
                  {content.reviewBadge}
                </span>
                <h3 className="mt-3 text-xl font-bold text-white">
                  {content.reviewSiteName}
                </h3>
                <p className="mt-1 text-sm text-slate-300">{content.reviewMeta}</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} from="right">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-7 shadow-sm sm:p-9">
              <div>
                <Icon name="Quote" className="h-9 w-9 text-solar-400" strokeWidth={1.6} />
                <blockquote className="mt-5 space-y-4 text-[15px] leading-relaxed text-navy-800">
                  <p>
                    &ldquo;{content.reviewQuote1}
                  </p>
                  <p>
                    {content.reviewQuote2}&rdquo;
                  </p>
                </blockquote>
                <p className="mt-5 text-sm font-bold text-navy-900">
                  {content.reviewAuthor}
                  <span className="ml-2 font-normal text-slate-500">{content.reviewAuthorMeta}</span>
                </p>
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
                {content.reviewSpecs.map((spec) => (
                  <div key={spec.label} className="bg-white px-4 py-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {spec.label}
                    </dt>
                    <dd className="mt-1 text-sm font-bold text-navy-900">
                      <CountUp value={spec.value} onView />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
