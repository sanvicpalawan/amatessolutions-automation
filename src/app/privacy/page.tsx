import type { Metadata } from "next";

import Footer from "@/components/site/Footer";
import SiteNav from "@/components/site/SiteNav";
import { loadContent, loadNavItems, loadSocialLinks } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const content = await loadContent();
  return {
    title: `Privacy Policy — ${content.siteName}`,
    description:
      "How Amates Solutions collects, uses and stores the information you send us through our website, quote form and WhatsApp.",
  };
}

type Section = { heading: string; body: string[] };

const SECTIONS: Section[] = [
  {
    heading: "Information we collect",
    body: [
      "When you request a free quote, contact us, or message us on WhatsApp, we collect the details you give us: your name, email address, phone number, project location, electricity bill and any information about your property or power needs.",
      "We also keep a record of the messages you exchange with us so that we can answer you properly and keep track of your enquiry.",
    ],
  },
  {
    heading: "Why we collect it",
    body: [
      "To prepare and send you a solar estimate or quotation, to answer your questions, to arrange site assessments and installations, and to follow up on an enquiry you have already started with us.",
      "We do not sell your information, and we do not use it for unrelated advertising.",
    ],
  },
  {
    heading: "How it is stored",
    body: [
      "Enquiries and message records are stored in our own secure backoffice database, hosted with established cloud infrastructure providers. Access is limited to Amates Solutions staff working on your enquiry.",
    ],
  },
  {
    heading: "Who we share it with",
    body: [
      "We use WhatsApp Business (Meta) to send and receive messages, so message content passes through Meta's services under their own terms.",
      "We may use an automated assistant to help draft replies; in that case the message text is processed by a third-party AI service in order to generate a response. Staff review and handle your enquiry throughout.",
      "We may also share your details with our own installation team or partners strictly to deliver the work you asked about.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "We keep enquiry and project records for as long as needed to provide our service, honour warranties, and meet our accounting and legal obligations. If you would like your details removed, contact us and we will delete what we are not required to keep.",
    ],
  },
  {
    heading: "Your choices",
    body: [
      "You can ask us what information we hold about you, ask us to correct it, or ask us to delete it. You can also ask us to stop contacting you at any time.",
      "In the Philippines, the Data Privacy Act of 2012 (Republic Act No. 10173) governs how personal information is handled. We aim to follow it.",
    ],
  },
  {
    heading: "Contact",
    body: [
      "For any privacy question or request, email hello@amatessolutions.com and we will respond as soon as we can.",
    ],
  },
];

export default async function PrivacyPage() {
  const [content, nav, social] = await Promise.all([
    loadContent(),
    loadNavItems(),
    loadSocialLinks(),
  ]);

  return (
    <main className="min-h-screen bg-white">
      <SiteNav nav={nav} social={social} content={content} />

      <div className="relative isolate overflow-hidden bg-navy-950 pb-16 pt-32 sm:pt-36">
        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-solar-400/40 bg-solar-400/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-solar-300">
            Legal
          </span>
          <h1 className="mt-6 text-hero font-extrabold uppercase tracking-tight text-white">
            Privacy Policy
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-slate-300 sm:text-base">
            How {content.siteName} handles the information you send us through this website,
            our quote form and WhatsApp.
          </p>
        </div>
      </div>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          {SECTIONS.map((section) => (
            <div key={section.heading} className="mb-10 last:mb-0">
              <h2 className="text-lg font-bold uppercase tracking-wide text-navy-950">
                {section.heading}
              </h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-[15px] leading-relaxed text-slate-600">
                  {paragraph}
                </p>
              ))}
            </div>
          ))}

          <p className="mt-12 text-xs text-slate-400">Last updated: 18 October 2026.</p>
        </div>
      </section>

      <Footer content={content} nav={nav} social={social} />
    </main>
  );
}
