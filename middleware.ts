// Use lightweight auth config (no speakeasy) for Edge Runtime compatibility
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

const publicRoutes = ['/login', '/api/auth', '/suspended'];

// Security: prevent search engine indexing
const NO_INDEX_HEADERS = { 'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet' } as const;
function withNoIndex(res: NextResponse) {
  Object.entries(NO_INDEX_HEADERS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export default auth(function middleware(req: NextRequest & { auth: any }) {
  const { pathname } = req.nextUrl;

  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  if (isPublic) return withNoIndex(NextResponse.next());

  const session = req.auth;
  if (!session?.user) {
    return withNoIndex(NextResponse.redirect(new URL('/login', req.url)));
  }

  const user = session.user as any;

  // 2FA: if enabled but not verified → verify-2fa
  if (
    user.twoFactorEnabled &&
    !user.twoFactorVerified &&
    !pathname.startsWith('/verify-2fa') &&
    !pathname.startsWith('/setup-2fa') &&
    !pathname.startsWith('/api/auth')
  ) {
    return withNoIndex(NextResponse.redirect(new URL('/verify-2fa', req.url)));
  }

  // 2FA: must be enabled — redirect to setup-2fa (no dashboard access without it)
  if (
    !user.twoFactorEnabled &&
    !pathname.startsWith('/setup-2fa') &&
    !pathname.startsWith('/api/auth')
  ) {
    return withNoIndex(NextResponse.redirect(new URL('/setup-2fa', req.url)));
  }

  // Subscription gate: non-master_admins blocked if license is inactive/expired
  if (
    user.role !== 'master_admin' &&
    (user.subscriptionStatus === 'inactive' || user.subscriptionStatus === 'expired') &&
    !pathname.startsWith('/suspended') &&
    !pathname.startsWith('/api/')
  ) {
    return withNoIndex(NextResponse.redirect(new URL('/suspended', req.url)));
  }

  if (user.role === 'master_admin' && pathname === '/dashboard') {
    return withNoIndex(NextResponse.redirect(new URL('/admin', req.url)));
  }

  const productionTiers = ['production', 'production_tools'];
  if (
    pathname.startsWith('/production') &&
    !pathname.startsWith('/production-exports') &&
    user.role !== 'master_admin' &&
    (!user.subscriptionTier || !productionTiers.includes(user.subscriptionTier))
  ) {
    return withNoIndex(NextResponse.redirect(new URL('/dashboard', req.url)));
  }

  if (
    pathname.startsWith('/production-exports') &&
    user.role !== 'master_admin' &&
    user.subscriptionTier !== 'production_tools'
  ) {
    return withNoIndex(NextResponse.redirect(new URL('/dashboard', req.url)));
  }

  const isAdminOnly = pathname.startsWith('/users') || pathname.startsWith('/api/users');
  if (isAdminOnly && user.role === 'user') {
    return withNoIndex(NextResponse.redirect(new URL('/dashboard', req.url)));
  }

  const isMasterAdminOnly =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (isMasterAdminOnly && user.role !== 'master_admin') {
    return withNoIndex(NextResponse.redirect(new URL('/dashboard', req.url)));
  }

  return withNoIndex(NextResponse.next());
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.ico).*)'],
};
