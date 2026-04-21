import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/user/(.*)",       // public profiles
  "/api/users/(.*)", // public reads; mutations check auth inside handlers
  "/share/(.*)",     // shared recipe pages (public, no auth required to view)
  "/api/share/(.*)", // public share data endpoint
  "/share-target(.*)", // PWA share target — auth handled in the page itself
  "/opengraph-image(.*)", // OG image — must be public for link previews
  "/twitter-image(.*)",   // Twitter card image
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest))(?:.*)|api|trpc)(.*)",
  ],
};
