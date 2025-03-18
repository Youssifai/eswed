import { authMiddleware } from "@clerk/nextjs";
import { NextRequest } from "next/server";

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default authMiddleware({
  publicRoutes: [
    "/", 
    "/api(.*)", 
    "/sign-in(.*)", 
    "/sign-up(.*)",
    "/_next(.*)",
    "/favicon.ico",
    "/public(.*)",
  ],
  afterAuth(auth, req: NextRequest) {
    // If the user is signed in and trying to access a public route
    if (auth.userId && req.nextUrl.pathname === "/sign-in") {
      const homeUrl = new URL("/", req.url);
      return Response.redirect(homeUrl);
    }
  },
});

// Match all routes except public assets, api routes, and static files
export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
