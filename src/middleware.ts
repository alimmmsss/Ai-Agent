import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/products(.*)',
    '/contact',
    '/about',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/(.*)',
]);

// Define dashboard routes that require owner access
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();

    // If accessing dashboard routes and not signed in
    if (isDashboardRoute(req)) {
        if (!userId) {
            // Not signed in, redirect to sign-in
            const signInUrl = new URL('/sign-in', req.url);
            signInUrl.searchParams.set('redirect_url', req.url);
            return NextResponse.redirect(signInUrl);
        }
        // Owner check is done in the dashboard layout (server component)
        // because Clerk middleware doesn't always have email in sessionClaims
    }

    // Protect non-public routes (require sign-in)
    if (!isPublicRoute(req)) {
        await auth.protect();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};

