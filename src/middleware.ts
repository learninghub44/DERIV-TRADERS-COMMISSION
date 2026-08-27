import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { SESSION_COOKIE, type SessionPayload } from '@/lib/session';

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not set.');
  }
  return new TextEncoder().encode(secret);
}

async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on every route except static assets, images, and Next.js internals,
  // so protected-path checks below actually execute on every request.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export async function updateSession(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  // Protected routes
  const protectedPaths = ['/dashboard', '/markup', '/commissions', '/earnings', '/clients', '/trading', '/analytics', '/reports', '/settings', '/notifications', '/admin'];
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isProtected && !session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Admin-only routes - the role is verified live against Neon (not just the
  // JWT claim), so a role change or revocation takes effect immediately
  // rather than only after the session token is refreshed.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    try {
      const sql = neon(process.env.DATABASE_URL!);
      const rows = await sql`SELECT role FROM users WHERE id = ${session.sub}`;
      if (rows[0]?.role !== 'super_admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
      }
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
