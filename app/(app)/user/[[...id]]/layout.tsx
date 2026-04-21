import type { Metadata } from "next";
import { supabaseServer as supabase } from "@/lib/supabase";

async function getProfileMeta(username: string) {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("clerk_user_id, display_name, image_url, follower_count, following_count")
    .eq("username", username)
    .single();

  if (!profile) return null;

  const { count } = await supabase
    .from("recipes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.clerk_user_id);

  return { ...profile, recipeCount: count ?? 0 };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}): Promise<Metadata> {
  const { id } = await params;
  const username = id?.[0];

  if (!username) {
    return { title: "My Profile — RecipeBox" };
  }

  const profile = await getProfileMeta(username);

  if (!profile) {
    return { title: `@${username} — RecipeBox` };
  }

  const displayName = profile.display_name || username;
  const description = `${profile.recipeCount} recipe${profile.recipeCount !== 1 ? "s" : ""} saved · ${profile.follower_count} follower${profile.follower_count !== 1 ? "s" : ""} · ${profile.following_count} following`;

  return {
    title: `${displayName} (@${username}) — RecipeBox`,
    description,
    openGraph: {
      title: `${displayName} (@${username})`,
      description,
      url: `/user/${username}`,
      siteName: "RecipeBox",
      images: profile.image_url
        ? [{ url: profile.image_url, alt: displayName, width: 400, height: 400 }]
        : [],
      type: "profile",
    },
    twitter: {
      card: profile.image_url ? "summary" : "summary",
      title: `${displayName} (@${username})`,
      description,
      images: profile.image_url ? [profile.image_url] : [],
    },
  };
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
