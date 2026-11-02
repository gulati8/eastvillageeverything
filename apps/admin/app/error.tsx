'use client';

import { isStaleActionError, STALE_PAGE_TITLE } from '../lib/stale';

const BUTTON = 'ui inline-block rounded-input border border-hairline bg-paper px-3 py-1 text-xs uppercase text-ink hover:border-accent';

/**
 * Route error boundary. A form posted from a tab opened before a redeploy
 * fails with Next's "Failed to find Server Action" and used to land here as
 * raw text; now it reads as an out-of-date page with a Reload button. Other
 * errors keep their message, in the same card look as the notices.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  if (isStaleActionError(error.message)) {
    return (
      <div
        role="alert"
        className="mx-auto mt-6 w-full max-w-md rounded-card border border-hairline border-l-[3px] border-l-accent bg-paper2 px-4 py-3 shadow-lg"
      >
        <p className="ui text-sm text-ink">{STALE_PAGE_TITLE}</p>
        <p className="mt-0.5 text-sm text-ink2">Nothing was saved.</p>
        <button type="button" onClick={() => window.location.reload()} className={`${BUTTON} mt-2`}>
          Reload
        </button>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="mx-auto mt-6 w-full max-w-md rounded-card border border-hairline border-l-[3px] border-l-[#C44] bg-paper2 px-4 py-3 shadow-lg"
    >
      <p className="ui text-sm text-ink">Something went wrong.</p>
      <p className="mt-0.5 break-words text-sm text-ink2">{error.message || 'Unknown error'}</p>
      {error.digest && <p className="ui mt-1 text-xs text-ink3">Ref {error.digest}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={reset} className={BUTTON}>Retry</button>
        <button type="button" onClick={() => window.location.reload()} className={BUTTON}>Reload</button>
      </div>
    </div>
  );
}
