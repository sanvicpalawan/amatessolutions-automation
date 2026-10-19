"use client";

import Link from "next/link";
import Logo from "@/components/site/Logo";
import { Icon } from "@/lib/icons";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/leads", label: "Leads CRM", icon: "Users" },
  { href: "/admin/notes", label: "David's Notes", icon: "StickyNote" },
  { href: "/admin/automations", label: "Automations", icon: "Zap" },
  { href: "/admin/blog", label: "Blog", icon: "FileText" },
  { href: "/admin/editor", label: "Site editor", icon: "Palette" },
  { href: "/admin/calendar", label: "Bookings", icon: "Calendar" },
  { href: "/admin/solar", label: "Catalogue", icon: "Boxes" },
  { href: "/admin/finance", label: "Finance", icon: "ChartLine" },
  { href: "/admin/monitoring", label: "Monitoring", icon: "Activity" },
  { href: "/admin/settings", label: "OpenRouter", icon: "Sliders" },
];
export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-solar-400 text-navy-950 shadow-lg shadow-solar-500/20"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon name={item.icon} className="h-[18px] w-[18px]" strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/10 bg-navy-950 px-4 py-3 lg:hidden">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-white">
          Amates Backoffice
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white"
        >
          Menu
        </button>
      </div>

      {open ? <div className="bg-navy-950 px-4 pb-4 lg:hidden">{nav}</div> : null}

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between bg-navy-950 p-5 lg:flex">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={32} className="shrink-0 text-white" squareClassName="fill-navy-950" />
            <span className="text-[11px] font-bold uppercase leading-tight tracking-[0.16em] text-white">
              Amates
              <br />
              <span className="text-slate-400">Backoffice</span>
            </span>
          </Link>

          <div className="mt-8">{nav}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="truncate text-xs font-semibold text-white">{email}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-500">Administrator</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-red-400/50 hover:text-red-300"
          >
            Sign out
          </button>
          <Link
            href="/"
            className="mt-2 block text-center text-[11px] uppercase tracking-wider text-slate-500 hover:text-solar-300"
          >
            View website →
          </Link>
        </div>
      </aside>
    </>
  );
}
