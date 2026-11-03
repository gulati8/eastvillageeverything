'use client';

import { slugify } from '../lib/slug';

/**
 * Read-only slug under a display-name input. The slug is derived from the
 * name on the server at save time; this line only shows what that will be.
 */
export function SlugLine({ display }: { display: string }) {
  const slug = display.trim() ? slugify(display) : '–';
  return (
    <div>
      <span className="ui text-xs uppercase text-ink3">Slug</span>
      <p className="font-mono text-sm text-ink2 mt-1" data-testid="slug-line" aria-live="polite">{slug}</p>
    </div>
  );
}
