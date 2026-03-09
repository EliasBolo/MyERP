import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.businessId = (user as any).businessId;
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
        (session.user as any).subscriptionStatus = token.subscriptionStatus;
        (session.user as any).subscriptionTier = token.subscriptionTier;
      }
      return session;
    },
    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = request.nextUrl.pathname.startsWith('/login');

      if (!isLoggedIn && !isOnLoginPage) {
        return Response.redirect(new URL('/login', request.nextUrl));
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
          subscriptionStatus: user.business?.subscriptionStatus ?? 'active',
          subscriptionTier: user.business?.subscriptionTier ?? 'standard',
        };
      },
    }),
  ],
});
