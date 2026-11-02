import { cookies } from 'next/headers';
import type { NoticeKind } from './notices';

/**
 * One-shot notice carried across a server-action redirect. Server actions
 * cannot reach the client `useNotices()` hook, so they write this cookie and
 * `FlashNotice` (mounted in the layout) reads and clears it after navigation.
 * `httpOnly: false` on purpose: the client reads it from `document.cookie`.
 */
export const FLASH_COOKIE = 'eve_flash';

export interface Flash {
  kind: NoticeKind;
  title: string;
  detail?: string;
}

export async function setFlash(kind: NoticeKind, title: string, detail?: string): Promise<void> {
  const store = await cookies();
  const flash: Flash = detail ? { kind, title, detail } : { kind, title };
  store.set(FLASH_COOKIE, JSON.stringify(flash), {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30,
    path: '/',
  });
}
