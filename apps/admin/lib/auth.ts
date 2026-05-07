import { redis } from './redis';
import { unsign } from 'cookie-signature';
import type { UserPublic } from '@eve/db';

const COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'connect.sid';
const SECRET = process.env.SESSION_SECRET ?? '';

export interface AdminSession {
  userId: string;
  user: UserPublic;
}

export async function readSession(rawCookie: string | undefined): Promise<AdminSession | null> {
  if (!rawCookie || !SECRET) return null;
  const trimmed = rawCookie.startsWith('s:') ? rawCookie.slice(2) : rawCookie;
  const sid = unsign(trimmed, SECRET);
  if (sid === false) return null;

  const raw = await redis().get(`sess:${sid}`);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data.userId !== 'string' || !data.user) return null;
    return { userId: data.userId, user: data.user as UserPublic };
  } catch {
    return null;
  }
}

export async function destroySession(rawCookie: string | undefined): Promise<void> {
  if (!rawCookie || !SECRET) return;
  const trimmed = rawCookie.startsWith('s:') ? rawCookie.slice(2) : rawCookie;
  const sid = unsign(trimmed, SECRET);
  if (sid === false) return;
  await redis().del(`sess:${sid}`);
}

export const SESSION_COOKIE = COOKIE_NAME;
