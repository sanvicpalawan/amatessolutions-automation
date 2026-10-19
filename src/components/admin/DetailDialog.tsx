"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Icon } from "@/lib/icons";

/**
 * A record popup built on the native `<dialog>` element, so focus trapping,
 * Escape to close and the backdrop come from the browser instead of being
 * reimplemented. Purely structural - the caller supplies the body and buttons.
 *
 * Clicking the backdrop closes it. The inner wrapper carries the padding so a
 * click on the padding is not mistaken for a click on the backdrop.
 */
export default function DetailDialog({
  open,
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,40rem)] bg-transparent p-0 backdrop:bg-navy-950/50"
    >
      <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold break-words text-navy-900">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs break-words text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:border-slate-400 hover:text-navy-900"
          >
            <Icon name="X" className="h-4 w-4" />
          </button>
        </div>
        <div className="@container min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/70 px-5 py-3">{footer}</div>
        ) : null}
      </div>
    </dialog>
  );
}
