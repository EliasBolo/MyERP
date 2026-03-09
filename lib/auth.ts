import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';
import * as speakeasy from 'speakeasy';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === 'update' && session) {
        return { ...token, ...session };
      }
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.businessId = (user as any).businessId;
        token.twoFactorEnabled = (user as any).twoFactorEnabled;
        token.twoFactorVerified = (user as any).twoFactorVerified ?? false;
        token.subscriptionStatus = (user as any).subscriptionStatus;
        token.subscriptionTier = (user as any).subscriptionTier;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).businessId = token.businessId;
        (session.user as any).twoFactorEnabled = token.twoFactorEnabled;
        (session.user as any).twoFactorVerified = token.twoFactorVerified;
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
        (session.user as any).subscriptionTier = token.subscriptionTier;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = request.nextUrl.pathname.startsWith('/login');
      const isOnSetup2FA = request.nextUrl.pathname.startsWith('/setup-2fa');
      const isOnVerify2FA = request.nextUrl.pathname.startsWith('/verify-2fa');

      if (!isLoggedIn && !isOnLoginPage) {
        return Response.redirect(new URL('/login', request.nextUrl));
      }

      if (isLoggedIn) {
        const user = auth.user as any;
        // If 2FA is enabled but not yet verified in this session → verify-2fa
        if (
          user.twoFactorEnabled &&
          !user.twoFactorVerified &&
          !isOnVerify2FA &&
          !isOnSetup2FA
        ) {
          return Response.redirect(new URL('/verify-2fa', request.nextUrl));
        }
        // Mandatory setup-2fa / verify-2fa redirects handled in middleware
      }

      return true;
    },
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('INVALID_CREDENTIALS');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: { business: true },
        });

        if (!user || !user.isActive) {
          throw new Error('INVALID_CREDENTIALS');
        }

        const isValid = await compare(credentials.password as string, user.password);
        if (!isValid) {
          throw new Error('INVALID_CREDENTIALS');
        }

        // Update last login
        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
          twoFactorEnabled: user.twoFactorEnabled,
          twoFactorVerified: !user.twoFactorEnabled, // verified if 2FA not enabled
          subscriptionStatus: user.business?.subscriptionStatus ?? 'active',
          subscriptionTier: user.business?.subscriptionTier ?? 'standard',
        };
      },
    }),
  ],
});

export function verifyTOTP(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(token || '').trim(),
    window: 6,
  });
}

export function generateTOTPSecret(email: string) {
  return speakeasy.generateSecret({
    name: `MyERP (${email})`,
    length: 20,
  });
}
