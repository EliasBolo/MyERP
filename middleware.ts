import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/api/auth'];

export default auth(async function middleware(req: NextRequest & { auth: any }) {
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

  // Role-based access control
  const isAdminOnly = pathname.startsWith('/users') || pathname.startsWith('/api/users');
  if (isAdminOnly && user.role === 'user') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  const isMasterAdminOnly = pathname.startsWith('/api/businesses') || pathname.startsWith('/businesses');
  if (isMasterAdminOnly && user.role !== 'master_admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.ico).*)'],
};
