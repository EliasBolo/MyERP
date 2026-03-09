// Lightweight auth config used by middleware (Edge Runtime safe - no Node.js modules)
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
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
  },
  providers: [
    // Provider config duplicated here without speakeasy import
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      // authorize runs in Node.js context (API route), not Edge
      async authorize() { return null; },
    }),
  ],
};
