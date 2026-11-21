export { default } from 'next-auth/middleware';

// Protect every page except login, auth/API routes (API routes check the session themselves) and static files.
export const config = {
  matcher: ['/((?!api|_next|login|favicon.ico|icon.svg|manifest.webmanifest).*)'],
};
