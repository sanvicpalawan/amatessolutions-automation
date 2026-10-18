import Link from "next/link";

import Logo from "@/components/site/Logo";
import { Icon } from "@/lib/icons";
import { WARRANTY_TERMS } from "@/lib/knowledge";
import { SocialIcon } from "@/lib/social";
import type { NavItem, SocialLink } from "@/db/schema";
import type { SiteContent } from "@/lib/site";

export default function Footer({
  content,
  nav,
  social,
}: {
  content: SiteContent;
  nav: NavItem[];
  social: SocialLink[];
}) {
  const footerNav = nav.filter((item) => item.location === "footer" && item.enabled);
  const groups = Array.from(new Set(footerNav.map((item) => item.group || "Company")));
  const footerSocial = social.filter((item) => item.location === "footer" && item.enabled);

  return (
    <footer className="bg-navy-950 pt-16 text-slate-400">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-10 pb-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <Logo size={32} className="shrink-0 text-white" squareClassName="fill-navy-950" />
              <span className="text-sm font-bold uppercase tracking-[0.18em] text-white">
                Amates Solutions
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed">
              Reliable energy. Smart choice. High-resilience solar hybrid systems designed, installed
              and monitored across Palawan, Philippines.
            </p>
          </div>

          {groups.map((group) => (
            <div key={group}>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">{group}</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {footerNav
                  .filter((item) => (item.group || "Company") === group)
                  .map((item) => (
                    <li key={item.id}>
                      <a
                        className="transition hover:text-solar-300"
                        href={item.href}
                        {...(item.href.startsWith("http")
                          ? { target: "_blank", rel: "noreferrer noopener" }
                          : {})}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">Contact</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a className="transition hover:text-solar-300" href={`mailto:${content.footerEmail}`}>
                  {content.footerEmail}
                </a>
              </li>
              <li>
                <a
                  className="transition hover:text-solar-300"
                  href={`https://wa.me/${content.footerWhatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  WhatsApp {content.footerWhatsapp}
                </a>
              </li>
              <li>{content.footerAddress}</li>
              <li>
                <Link className="transition hover:text-solar-300" href="/blog">
                  Blog
                </Link>
              </li>
              <li>
                <Link className="transition hover:text-solar-300" href="/admin">
                  Admin backoffice
                </Link>
              </li>
            </ul>

            {footerSocial.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {footerSocial.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    title={item.platform}
                    aria-label={item.platform}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-400 transition hover:border-solar-400/60 hover:text-solar-300"
                  >
                    <SocialIcon name={item.icon} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/10 py-7">
          <h5 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Warranty &amp; monitoring terms
          </h5>
          <ul className="mt-3 grid gap-1.5 text-[11px] leading-relaxed text-slate-500 md:grid-cols-2">
            {WARRANTY_TERMS.map((term) => (
              <li key={term}>• {term}</li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-6 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Amates Solutions. All rights reserved.</p>
          <p>Reliable energy. Smart choice.</p>
        </div>
      </div>
    </footer>
  );
}
