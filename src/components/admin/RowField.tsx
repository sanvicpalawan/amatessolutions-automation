import type { ReactNode } from "react";

/**
 * A label/value pair for the stacked admin layouts.
 *
 * Every admin collection renders as a table at wide widths and as a stack of
 * cards below that, because a seven-column table on a phone is unreadable. A
 * card has no column header above it, so each value carries its own label.
 *
 * `dt`/`dd`, so a group of these belongs inside a `<dl>`.
 */
export default function RowField({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  tone?: "plain" | "strong" | "good" | "bad" | "muted";
}) {
  const tones: Record<string, string> = {
    plain: "text-navy-900",
    strong: "font-extrabold text-navy-900",
    good: "font-semibold text-emerald-700",
    bad: "font-semibold text-red-600",
    muted: "text-slate-500",
  };

  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-sm break-words tabular-nums ${tones[tone] ?? tones.plain}`}>
        {value}
      </dd>
    </div>
  );
}
