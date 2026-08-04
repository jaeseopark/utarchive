import { useId, useState, type ReactNode } from "react";
import clsx from "clsx";

export interface CollapsibleGroupProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  accessory?: ReactNode;
}

function CollapsibleGroup({
  title,
  children,
  defaultOpen = false,
  className,
  headerClassName,
  contentClassName,
  accessory,
}: CollapsibleGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={clsx("space-y-2", className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((current) => !current)}
        className={clsx(
          "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50",
          headerClassName,
        )}
      >
        <span className="truncate">{title}</span>
        <span className="flex items-center gap-2 text-slate-400">
          {accessory ? (
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.16em]">
              {accessory}
            </span>
          ) : null}
          <svg
            className={clsx("h-4 w-4 transition-transform", isOpen ? "rotate-180" : "rotate-0")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div id={contentId} className={clsx("space-y-1", contentClassName)}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

export { CollapsibleGroup };
