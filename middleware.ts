// Use lightweight auth config (no speakeasy) for Edge Runtime compatibility
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

const publicRoutes = ['/login', '/api/auth', '/verify-2fa', '/setup-2fa', '/suspended'];

export default auth(function middleware(req: NextRequest & { auth: any }) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  if (isPublic) return NextResponse.next();

  const session = req.auth;

  // Redirect to login if not authenticated
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const user = session.user as any;

  // 2FA check: if enabled but not verified, redirect to verify page
  if (
    user.twoFactorEnabled &&
    !user.twoFactorVerified &&
    !pathname.startsWith('/verify-2fa') &&
    !pathname.startsWith('/setup-2fa')
  ) {
    return NextResponse.redirect(new URL('/verify-2fa', req.url));
  }

  // Subscription gate: non-master_admins blocked if license is inactive/expired
  if (
    user.role !== 'master_admin' &&
    (user.subscriptionStatus === 'inactive' || user.subscriptionStatus === 'expired') &&
    !pathname.startsWith('/suspended') &&
    !pathname.startsWith('/api/')
  ) {
    return NextResponse.redirect(new URL('/suspended', req.url));
  }

  // master_admin has no business — redirect them away from business pages to /admin
  if (user.role === 'master_admin' && pathname === '/dashboard') {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  // Παραγωγή — only Production / Production - Exports tiers
  const productionTiers = ['production', 'production_tools'];
  if (
    pathname.startsWith('/production') &&
    !pathname.startsWith('/production-exports') &&
    user.role !== 'master_admin' &&
    (!user.subscriptionTier || !productionTiers.includes(user.subscriptionTier))
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Production-Tools — only production_tools tier
  if (
    pathname.startsWith('/production-exports') &&
    user.role !== 'master_admin' &&
    user.subscriptionTier !== 'production_tools'
  ) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Role-based access control
  const isAdminOnly = pathname.startsWith('/users') || pathname.startsWith('/api/users');
  if (isAdminOnly && user.role === 'user') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Master-admin-only routes
  const isMasterAdminOnly =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin');
  if (isMasterAdminOnly && user.role !== 'master_admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.ico).*)'],
};
