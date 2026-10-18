"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Logo from "@/components/site/Logo";
import { Icon } from "@/lib/icons";
import { SocialIcon } from "@/lib/social";
import type { NavItem, SocialLink } from "@/db/schema";
import type { SiteContent } from "@/lib/site";

export default function SiteNav({
  nav,
  social,
  content,
}: {
  nav: NavItem[];
  social: SocialLink[];
  content: SiteContent;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const headerNav = nav.filter((item) => item.location === "header" && item.enabled);
  const headerSocial = social.filter((item) => item.location === "header" && item.enabled);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-navy-950/90 py-3 backdrop-blur-md"
          : "bg-gradient-to-b from-navy-950/70 to-transparent py-5"
      }`}
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <Logo size={32} className="shrink-0 text-white" squareClassName="fill-navy-950" />
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-white">
            {content.siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {headerNav.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="text-[13px] font-medium uppercase tracking-wider text-white/75 transition hover:text-solar-300"
            >
              {item.label}
            </a>
          ))}

          {headerSocial.length > 0 ? (
            <span className="flex items-center gap-1 border-l border-white/15 pl-4">
              {headerSocial.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={item.platform}
                  aria-label={item.platform}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-solar-300 sm:h-8 sm:w-8"
                >
                  <SocialIcon name={item.icon} className="h-4 w-4" />
                </a>
              ))}
            </span>
          ) : null}

          <a
            href="#quote"
            className="rounded-full bg-solar-400 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wider text-navy-950 shadow-lg shadow-solar-500/25 transition hover:-translate-y-0.5 hover:bg-solar-300"
          >
            {content.heroCtaPrimary}
          </a>
        </nav>

        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 text-white lg:hidden"
        >
          <span className="sr-only">Menu</span>
          <Icon name={open ? "X" : "Menu"} className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </div>

      {open ? (
        <div className="mt-3 border-t border-white/10 bg-navy-950/97 px-5 py-4 backdrop-blur lg:hidden">
          <div className="flex flex-col gap-1">
            {headerNav.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3.5 text-sm font-medium text-white/80 transition hover:bg-white/5 hover:text-solar-300"
              >
                {item.label}
              </a>
            ))}
            {headerSocial.length > 0 ? (
              <div className="mt-2 flex gap-2 border-t border-white/10 pt-3">
                {headerSocial.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={item.platform}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70"
                  >
                    <SocialIcon name={item.icon} className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : null}
            <a
              href="#quote"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-solar-400 px-5 py-4 text-center text-xs font-bold uppercase tracking-wider text-navy-950"
            >
              {content.heroCtaPrimary}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
