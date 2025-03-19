import { authMiddleware } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";

// Explicitly use Node.js runtime 
export const runtime = "nodejs";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default authMiddleware({
  publicRoutes: [
    "/",
    "/login(.*)",
    "/signup(.*)",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/api/health",
    "/api/webhook(.*)"
  ],
  afterAuth(auth, req, evt) {
    // Handle users who aren't authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/login', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return Response.redirect(signInUrl);
    }

    // If the user is logged in and trying to access sign-in page, redirect them to home
    if (auth.userId && (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/signup'))) {
      const homeUrl = new URL('/notes', req.url);
      return Response.redirect(homeUrl);
    }
  }
});

// Match all routes except public assets, api routes, and static files
export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)', 
    '/', 
    '/(api|trpc)(.*)',
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    }
  ],
  runtime: "nodejs" // Explicitly use Node.js runtime instead of Edge
};

export function middleware(request: NextRequest) {
  return NextResponse.next();
}
