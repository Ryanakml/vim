import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
  const landingProxyOrigin =
    process.env.NEXT_PUBLIC_LANDING_PROXY_ORIGIN ||
    "https://chattiphy-landing-page.vercel.app";
  const normalizedLandingProxyOrigin = landingProxyOrigin.replace(/\/$/, "");

  const pathname = req.nextUrl.pathname;
  const isLandingAssetRequest =
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/assets/") ||
    pathname === "/favicon.ico";

  if (isLandingAssetRequest) {
    const referer = req.headers.get("referer");
    let refererPathname = "";

    if (referer) {
      try {
        refererPathname = new URL(referer).pathname;
      } catch {
        refererPathname = "";
      }
    }

    if (refererPathname === "/") {
      const rewrittenUrl = new URL(
        `${normalizedLandingProxyOrigin}${pathname}${req.nextUrl.search}`,
      );
      return NextResponse.rewrite(rewrittenUrl);
    }
  }

  // Protect non-public routes - redirect to signin if not authenticated
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Run for selected static asset paths to support root landing proxy asset loading
    "/_next/static/:path*",
    "/images/:path*",
    "/assets/:path*",
    "/favicon.ico",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
