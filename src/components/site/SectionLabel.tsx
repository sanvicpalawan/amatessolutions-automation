import type { ReactNode } from "react";

/** "— 01  Eyebrow" — numbered section marker with a rule that draws itself. */
export default function SectionLabel({
  index,
  children,
  tone = "light",
}: {
  index: string;
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  return (
    <p
      className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] ${
        tone === "dark" ? "text-solar-300" : "text-solar-700"
      }`}
    >
      <span className="h-px w-10 bg-current" />
      <span className="tabular-nums">{index}</span>
      <span className={tone === "dark" ? "text-slate-300" : "text-slate-600"}>{children}</span>
    </p>
  );
}
