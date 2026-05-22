import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

/**
 * Lightweight config safe for the Edge runtime (no Node.js crypto, no DB).
 * Used by middleware.ts for route protection.
 * Credentials provider is added only in auth.ts (Node.js only).
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/sign-in',
  },
  providers: [GitHub],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isPublicRoute =
        path.startsWith('/sign-in') ||
        path.startsWith('/sign-up') ||
        path.startsWith('/api/auth') ||
        path.startsWith('/api/health');

      if (isPublicRoute) return true;
      if (isLoggedIn) return true;

      return false; // redirect to /sign-in
    },
  },
};
