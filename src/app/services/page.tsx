import type { Metadata } from "next";

import Footer from "@/components/site/Footer";
import Services from "@/components/site/Services";
import SiteNav from "@/components/site/SiteNav";
import { loadContent, loadNavItems, loadSocialLinks } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const content = await loadContent();
  return {
    title: `${content.servicesPageTitle} — ${content.siteName}`,
    description: content.servicesPageSubtitle,
  };
}

export default async function ServicesPage() {
  const [content, nav, social] = await Promise.all([
    loadContent(),
    loadNavItems(),
    loadSocialLinks(),
  ]);

  return (
    <main className="min-h-screen bg-white">
      <SiteNav nav={nav} social={social} content={content} />
      <Services content={content} />
      <Footer content={content} nav={nav} social={social} />
    </main>
  );
}
