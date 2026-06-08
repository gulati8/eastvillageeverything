'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomBytes } from 'node:crypto';
import { sign } from 'cookie-signature';
import { UserModel } from '@eve/db';
import { redis } from '../redis';
import { destroySession, SESSION_COOKIE } from '../auth';
import { assertSameOriginAction, sanitizeAdminNextPath } from '../security';

const SECRET = process.env.SESSION_SECRET ?? '';
const SESSION_TTL_SECONDS = 24 * 60 * 60;

function bounceWithError(error: string, next: string): never {
  const params = new URLSearchParams({ error, next });
  redirect(`/login?${params.toString()}`);
}

export async function loginAction(formData: FormData): Promise<void> {
  await assertSameOriginAction();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = sanitizeAdminNextPath(formData.get('next'));

  if (!email || !password) bounceWithError('Email and password are required.', next);
  if (!SECRET) bounceWithError('Server misconfigured: SESSION_SECRET is empty.', next);

  const user = await UserModel.authenticate(email, password);
  if (!user) bounceWithError('Invalid email or password.', next);

  const sid = randomBytes(16).toString('hex');
  const sessionData = {
    cookie: {
      originalMaxAge: SESSION_TTL_SECONDS * 1000,
      expires: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
      httpOnly: true,
      path: '/',
    },
    userId: user.id,
    user,
  };

  await redis().set(`sess:${sid}`, JSON.stringify(sessionData), 'EX', SESSION_TTL_SECONDS);

  const signed = 's:' + sign(sid, SECRET);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await assertSameOriginAction();
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  await destroySession(raw);
  cookieStore.delete(SESSION_COOKIE);
  redirect('/login');
}
