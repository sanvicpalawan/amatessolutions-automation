import CoverageMap from "@/components/site/CoverageMap";
import Footer from "@/components/site/Footer";
import Hero from "@/components/site/Hero";
import IntakeForm from "@/components/site/IntakeForm";
import ProjectReview from "@/components/site/ProjectReview";
import SiteNav from "@/components/site/SiteNav";
import StepFramework from "@/components/site/StepFramework";
import Verticals from "@/components/site/Verticals";
import WhyAmates from "@/components/site/WhyAmates";
import { loadContent, loadNavItems, loadSocialLinks } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [content, nav, social] = await Promise.all([
    loadContent(),
    loadNavItems(),
    loadSocialLinks(),
  ]);

  return (
    <main className="min-h-screen bg-white">
      <SiteNav nav={nav} social={social} content={content} />
      <Hero content={content} />
      <WhyAmates content={content} />
      <StepFramework content={content} />
      <Verticals content={content} />
      <CoverageMap
        towns={content.heroSubCities}
        featured="Linapacan"
        featuredNote={content.reviewSiteName}
      />
      <ProjectReview content={content} />
      <IntakeForm content={content} />
      <Footer content={content} nav={nav} social={social} />
    </main>
  );
}
