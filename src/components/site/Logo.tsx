/**
 * Amates Solutions brand mark.
 *
 * A black rounded square carrying a white peak (Λ) — the "A" of Amates drawn as
 * a geometric roof/energy peak. Reproduces the official lockup: mark + wordmark
 * + optional tagline.
 */
export default function Logo({
  size = 32,
  className = "",
  squareClassName = "",
  title,
}: {
  size?: number;
  className?: string;
  squareClassName?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <rect width="32" height="32" rx="7" className={squareClassName || "fill-navy-950"} />
      {/* Peak / "A" mark */}
      <path
        d="M7.4 23.5 16 6.5l8.6 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
