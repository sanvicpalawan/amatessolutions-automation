import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import ThemeStyles from "@/components/site/ThemeStyles";
import WhatsAppButton from "@/components/site/WhatsAppButton";
import { loadContent, loadTheme } from "@/lib/site";

export const dynamic = "force-dynamic";

/** viewportFit=cover lets the CSS safe-area insets actually resolve. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#060d1a",
};

export async function generateMetadata() {
  const content = await loadContent();
  return {
    title: `${content.siteName} — High-Resilience Solar Hybrid Systems, Palawan`,
    description: content.heroSubtitle,
    keywords: [
      "solar Palawan",
      "El Nido solar",
      "Coron solar",
      "Puerto Princesa solar",
      "off-grid hybrid solar Philippines",
    ],
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [theme, content] = await Promise.all([loadTheme(), loadContent()]);

  return (
    <html lang="en">
      <head>
        <ThemeStyles theme={theme} />
      </head>
      <body className="min-h-screen bg-white text-navy-900 antialiased">
        {children}
        <WhatsAppButton number={content.footerWhatsapp} />
        <span hidden data-site-name={content.siteName} />
      </body>
    </html>
  );
}
