import { NextResponse, type NextRequest } from 'next/server';
import { readSession, SESSION_COOKIE } from './lib/auth';

export const runtime = 'nodejs';

const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico'];
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function appPath(pathname: string): string {
  if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
    return pathname.slice(basePath.length) || '/';
  }
  return pathname;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const pathnameWithoutBase = appPath(pathname);

  if (PUBLIC_PATHS.some((p) => pathnameWithoutBase === p || pathnameWithoutBase.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSession(cookie);

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathnameWithoutBase);
    return NextResponse.redirect(url);
  }

  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-eve-user-id', session.userId);
  return NextResponse.next({ request: { headers: reqHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
