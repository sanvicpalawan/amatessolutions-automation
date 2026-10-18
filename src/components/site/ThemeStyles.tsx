import type { SiteTheme } from "@/lib/site";

/**
 * Injects the owner's palette + fonts as CSS custom properties at runtime.
 * Overriding the variables Tailwind's `@theme` block generates means every
 * `bg-solar-500` / `text-navy-900` utility picks up the new value instantly.
 */
export default function ThemeStyles({ theme }: { theme: SiteTheme }) {
  const c = theme.colors;

  const css = `
:root {
  --color-solar-300: ${c.primaryLight} !important;
  --color-solar-400: ${c.primaryLight} !important;
  --color-solar-500: ${c.primary} !important;
  --color-solar-600: ${c.primary} !important;
  --color-solar-700: ${c.primaryDark} !important;
  --color-navy-600: ${c.navyMid} !important;
  --color-navy-700: ${c.navyMid} !important;
  --color-navy-800: ${c.navy} !important;
  --color-navy-900: ${c.navy} !important;
  --color-navy-950: ${c.navyDeep} !important;
  --font-sans: "${theme.bodyFont}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif !important;
  --font-display: "${theme.headingFont}", ui-sans-serif, system-ui, sans-serif !important;
  --brand-radius: ${theme.radius};
  --brand-text: ${c.text};
  --brand-text-muted: ${c.textMuted};
  --brand-surface: ${c.surface};
  --brand-surface-muted: ${c.surfaceMuted};
}
.font-display { font-family: "${theme.headingFont}", ui-sans-serif, system-ui, sans-serif; }
h1, h2, h3, .font-display { font-family: var(--font-display); }
`.trim();

  const fontQuery = Array.from(
    new Set(
      [theme.bodyFont, theme.headingFont]
        .filter(Boolean)
        .map((font) => font.replace(/\s+/g, "+")),
    ),
  ).join("&family=");

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {fontQuery ? (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${fontQuery}:wght@400;500;600;700;800&display=swap`}
        />
      ) : null}
      <style id="amates-theme" dangerouslySetInnerHTML={{ __html: css }} />
    </>
  );
}
