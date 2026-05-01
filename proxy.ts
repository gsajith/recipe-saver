import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// Routes that skip the onboarding username check
const isOnboardingExempt = createRouteMatcher([
  "/onboarding",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/(.*)",
  "/opengraph-image(.*)",
  "/twitter-image(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { userId } = await auth();
  if (userId && !isOnboardingExempt(req)) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await supabase
      .from("user_profiles")
      .select("username")
      .eq("clerk_user_id", userId)
      .single();

    // PGRST116 = "no rows returned" — user genuinely has no profile yet.
    // Any other error (connection issue, cold start, etc.) should not redirect,
    // otherwise a transient Supabase hiccup traps the user in an onboarding loop.
    const noProfile =
      error?.code === "PGRST116" || (!error && !data?.username);
    if (noProfile) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest))(?:.*)|api|trpc)(.*)",
  ],
};
