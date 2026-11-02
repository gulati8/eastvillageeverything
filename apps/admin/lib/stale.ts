/**
 * Pure helpers for the "this tab is out of date" handling. No React, no DOM.
 *
 * A form posted from a tab opened before a redeploy fails inside Next with
 * `Failed to find Server Action "<id>". This request might be from an older or
 * newer deployment.`; `app/error.tsx` turns that into a reload prompt.
 */

export const STALE_TITLE = 'The admin was updated since you opened this page. Reload to continue.';
export const STALE_PAGE_TITLE = 'This page is out of date. Reload to continue.';
export const STALE_BUTTON_LABEL = 'Reload first';

/** True when an error message is Next's "unknown Server Action" failure. */
export function isStaleActionError(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  if (message.includes('Failed to find Server Action')) return true;
  return message.includes('Server Action') && /deployment/i.test(message);
}

/**
 * Compares the id the tab saw first with the one the server answers now.
 * Null on either side means "unknown" (never fetched, signed out, offline) and
 * is never a change.
 */
export function versionChanged(first: string | null, current: string | null): boolean {
  return first !== null && current !== null && first !== current;
}
