'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useNotices } from './Notices';
import { isNoticeKind } from '../lib/notices';

const COOKIE = 'eve_flash';

function readFlashCookie(): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`));
  return match ? match.slice(COOKIE.length + 1) : null;
}

function clearFlashCookie() {
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Raises the one-shot notice a server action left in the `eve_flash` cookie.
 * The effect has no dependency list on purpose: a server-action redirect to the
 * same path (Save on an edit page, a validation bounce back to the form) does
 * not change `usePathname()`, but it does re-render the layout tree, and the
 * cookie is cleared on first read so repeats are harmless.
 */
export function FlashNotice() {
  const pathname = usePathname();
  const { notify } = useNotices();

  useEffect(() => {
    const raw = readFlashCookie();
    if (!raw) return;
    clearFlashCookie();
    try {
      const flash = JSON.parse(decodeURIComponent(raw)) as { kind?: unknown; title?: unknown; detail?: unknown };
      if (!isNoticeKind(flash.kind) || typeof flash.title !== 'string') return;
      notify({
        kind: flash.kind,
        title: flash.title,
        detail: typeof flash.detail === 'string' ? flash.detail : undefined,
      });
    } catch {
      // A malformed cookie is dropped; nothing to show.
    }
  });

  void pathname;
  return null;
}
