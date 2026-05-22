import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Use the lightweight edge-safe config — no DB calls, no bcrypt
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
