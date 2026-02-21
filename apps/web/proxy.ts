import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that don't require authentication
// Clerk handles signin/signup with hosted pages - removed from here
const isPublicRoute = createRouteMatcher([
  "/", // Landing page
  "/api(.*)", // API routes handled separately
  "/signin(.*)", // Clerk sign-in route and children
  "/signup(.*)", // Clerk sign-up route and children
  "/sso-callback(.*)", // SSO callback route
  "/widget-demo(.*)", // Widget demo (public)
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect non-public routes - redirect to signin if not authenticated
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
