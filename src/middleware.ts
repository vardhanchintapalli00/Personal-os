import { withAuth } from 'next-auth/middleware';

export default withAuth({ pages: { signIn: '/login' } });

export const config = {
    matcher: ['/((?!api|_next|login|pwa-icon|favicon.ico|icon.svg|manifest.webmanifest).*)'],
};
