import { cookies, headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { readSession, SESSION_COOKIE, type AdminSession } from './auth';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export class AdminAuthError extends Error {
  status = 401;

  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AdminAuthError';
  }
}

export class AdminOriginError extends Error {
  status = 403;

  constructor(message = 'Invalid request origin') {
    super(message);
    this.name = 'AdminOriginError';
  }
}

function stripBasePath(pathname: string): string {
  if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
    return pathname.slice(basePath.length) || '/';
  }
  return pathname;
}

export function sanitizeAdminNextPath(value: unknown, fallback = '/places'): string {
  const raw = String(value ?? fallback).trim();
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(raw, 'https://admin.local');
  } catch {
    return fallback;
  }

  const pathname = stripBasePath(parsed.pathname);
  if (pathname === '/login' || pathname.startsWith('/login/')) return fallback;
  return `${pathname}${parsed.search}${parsed.hash}`;
}

function assertSameOriginFromHeaders(h: Headers): void {
  const origin = h.get('origin');
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!origin || !host) throw new AdminOriginError();

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new AdminOriginError();
  }

  if (originUrl.host !== host) throw new AdminOriginError();
}

export async function requireAdminMutation(): Promise<AdminSession> {
  const h = await headers();
  assertSameOriginFromHeaders(h);

  const cookieStore = await cookies();
  const session = await readSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) throw new AdminAuthError();
  return session;
}

export async function requireAdminRequest(req: NextRequest, { mutation = false } = {}): Promise<AdminSession> {
  if (mutation) assertSameOriginFromHeaders(req.headers);

  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) throw new AdminAuthError();
  return session;
}

export function adminErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AdminAuthError || error instanceof AdminOriginError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

export async function assertSameOriginAction(): Promise<void> {
  const h = await headers();
  assertSameOriginFromHeaders(h);
}
