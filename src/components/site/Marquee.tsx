/** Endless horizontal ticker. CSS only; pauses on hover. */
export default function Marquee({ items, className = "" }: { items: readonly string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      <div className="flex w-max animate-drift hover:[animation-play-state:paused]">
        {[0, 1].map((half) => (
          <ul key={half} className="flex shrink-0 items-center">
            {[0, 1, 2].flatMap((repeat) =>
              items.map((item) => (
                <li
                  key={`${repeat}-${item}`}
                  className="flex items-center gap-8 pr-8 text-sm font-semibold uppercase tracking-[0.22em] text-slate-300"
                >
                  {item}
                  <span className="h-1.5 w-1.5 rotate-45 bg-solar-400" />
                </li>
              )),
            )}
          </ul>
        ))}
      </div>
    </div>
  );
}
