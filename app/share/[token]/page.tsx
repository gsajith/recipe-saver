import { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Clock, Users, ExternalLink } from "lucide-react";
import { supabaseServer as supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/AppHeader";
import { SaveButton } from "./SaveButton";
import styles from "./page.module.css";

interface SharedRecipe {
  id: string;
  title: string;
  url: string;
  thumbnail_url: string | null;
  cook_time: string | null;
  servings: string | null;
  tags: string[];
  sharer_username: string | null;
  sharer_user_id: string;
}

async function getSharedRecipe(token: string): Promise<SharedRecipe | null> {
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id, title, url, thumbnail_url, cook_time, servings, user_id")
    .eq("share_token", token)
    .single();

  if (error || !recipe) return null;

  const [{ data: profile }, { data: tagRows }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("username")
      .eq("clerk_user_id", recipe.user_id)
      .single(),
    supabase
      .from("recipe_tags")
      .select("tag")
      .eq("recipe_id", recipe.id),
  ]);

  return {
    id: recipe.id,
    title: recipe.title,
    url: recipe.url,
    thumbnail_url: recipe.thumbnail_url,
    cook_time: recipe.cook_time,
    servings: recipe.servings,
    tags: tagRows?.map((r) => r.tag) ?? [],
    sharer_username: profile?.username ?? null,
    sharer_user_id: recipe.user_id,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const recipe = await getSharedRecipe(token);

  if (!recipe) {
    return { title: "Recipe not found — RecipeBox" };
  }

  const sharedBy = recipe.sharer_username
    ? `Shared by @${recipe.sharer_username}`
    : "Shared via RecipeBox";

  const parts: string[] = [];
  if (recipe.cook_time) parts.push(`⏱ ${recipe.cook_time}`);
  if (recipe.servings) parts.push(`👥 ${recipe.servings}`);
  if (recipe.tags.length > 0) parts.push(recipe.tags.join(", "));
  try {
    parts.push(new URL(recipe.url).hostname.replace(/^www\./, ""));
  } catch {}

  const description = [sharedBy, ...parts].join(" · ");
  return {
    title: `${recipe.title} — RecipeBox`,
    description,
    openGraph: {
      title: recipe.title,
      description,
      url: `/share/${token}`,
      siteName: "RecipeBox",
      images: recipe.thumbnail_url
        ? [{ url: recipe.thumbnail_url, alt: recipe.title }]
        : [],
      type: "website",
    },
    twitter: {
      card: recipe.thumbnail_url ? "summary_large_image" : "summary",
      title: recipe.title,
      description,
      images: recipe.thumbnail_url ? [recipe.thumbnail_url] : [],
    },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [recipe, { userId }] = await Promise.all([
    getSharedRecipe(token),
    auth(),
  ]);

  if (!recipe) notFound();

  let hostname = "";
  try {
    hostname = new URL(recipe.url).hostname.replace(/^www\./, "");
  } catch {}

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <AppHeader />
      </div>

      <main className={styles.main}>
        <p className={styles.attribution}>
          <a
            href={`/user/${recipe.sharer_username ?? recipe.sharer_user_id}`}
            className={styles.sharerLink}>
            {recipe.sharer_username
              ? `@${recipe.sharer_username}`
              : "A RecipeBox user"}
          </a>
          {" shared a recipe with you"}
        </p>

        <div className={styles.card}>
          {recipe.thumbnail_url && (
            <div className={styles.cardImage}>
              <img src={recipe.thumbnail_url} alt={recipe.title} />
            </div>
          )}

          <div className={styles.cardBody}>
            <h1 className={styles.title}>{recipe.title}</h1>

            {(recipe.cook_time || recipe.servings) && (
              <div className={styles.metaRow}>
                {recipe.cook_time && (
                  <span className={styles.metaItem}>
                    <Clock size={13} />
                    {recipe.cook_time}
                  </span>
                )}
                {recipe.cook_time && recipe.servings && (
                  <span className={styles.metaDot}>·</span>
                )}
                {recipe.servings && (
                  <span className={styles.metaItem}>
                    <Users size={13} />
                    {recipe.servings}
                  </span>
                )}
              </div>
            )}

            {hostname && (
              <a
                href={recipe.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sourceLink}>
                <ExternalLink size={12} />
                {hostname}
              </a>
            )}

            {recipe.tags.length > 0 && (
              <div className={styles.tags}>
                {recipe.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <SaveButton token={token} isSignedIn={!!userId} />
      </main>
    </div>
  );
}
