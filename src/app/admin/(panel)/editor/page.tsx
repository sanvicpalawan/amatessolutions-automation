import Link from "next/link";

import PageHeader from "@/components/admin/PageHeader";
import SiteEditor from "@/components/admin/SiteEditor";
import { loadContent, loadNavItems, loadSocialLinks, loadTheme } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function SiteEditorPage() {
  const [content, theme, nav, social] = await Promise.all([
    loadContent(),
    loadTheme(),
    loadNavItems(),
    loadSocialLinks(),
  ]);

  return (
    <div className="max-w-6xl">
      <PageHeader
        eyebrow="Site control"
        title="Site editor"
        description="Every aspect of the public website — fonts, colours, copy, images, navigation and social links."
        action={
          <Link
            href="/"
            target="_blank"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-navy-900 transition hover:bg-white"
          >
            View site →
          </Link>
        }
      />

      <SiteEditor
        initialContent={content}
        initialTheme={theme}
        initialNav={nav.map((item) => ({
          label: item.label,
          href: item.href,
          location: item.location,
          group: item.group,
          enabled: item.enabled,
        }))}
        initialSocial={social.map((item) => ({
          platform: item.platform,
          url: item.url,
          icon: item.icon,
          location: item.location,
          enabled: item.enabled,
        }))}
      />
    </div>
  );
}
