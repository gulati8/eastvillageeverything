import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** Open on first render. Nothing remembers the state across loads: a native `<details>` holds it. */
  defaultOpen?: boolean;
  /** First line of the body, so a closed header is the title alone. */
  description?: string;
  /** Accessible name of the group; defaults to the title. */
  'aria-label'?: string;
  className?: string;
  /** Rendered at the right of the summary, before the chevron (Photos puts its hint here). */
  summaryExtra?: ReactNode;
  children?: ReactNode;
}

/**
 * A card section whose body collapses. Built on `<details>` so the browser
 * owns the open state (no React state, nothing persisted) and the body stays
 * in the DOM while closed: form fields inside still submit.
 */
export function CollapsibleSection({
  title,
  defaultOpen = false,
  description,
  'aria-label': ariaLabel,
  className = '',
  summaryExtra,
  children,
}: Props) {
  return (
    <details
      open={defaultOpen || undefined}
      aria-label={ariaLabel ?? title}
      className={`group rounded-card border border-hairline bg-paper2 ${className}`.trim()}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-x-4 rounded-card p-4 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:p-5 [&::-webkit-details-marker]:hidden">
        <h2 className="text-2xl">{title}</h2>
        <span className="flex shrink-0 items-center gap-3">
          {summaryExtra}
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-5 w-5 text-ink3 transition-transform duration-150 group-open:rotate-180"
          >
            <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="px-4 pb-4 md:px-5 md:pb-5">
        {description && <p className="mb-4 text-sm text-ink2">{description}</p>}
        {children}
      </div>
    </details>
  );
}
