import { withAuth } from 'next-auth/middleware';

// Send signed-out visitors to our own /login page (not NextAuth's default page).
export default withAuth({ pages: { signIn: '/login' } });

// Protect every page except login, auth/API routes (API routes check the session themselves) and public files.
export const config = {
  matcher: ['/((?!api|_next|login|pwa-icon|sw.js|.well-known|favicon.ico|icon.svg|manifest.webmanifest).*)'],
};
