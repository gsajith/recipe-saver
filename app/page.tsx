"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, Tag, Search, Clipboard, X } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { RecipeForm } from "@/components/RecipeForm";
import { AppHeader } from "@/components/AppHeader";
import { RecipeDetail } from "@/components/RecipeDetail";
import { RecipeFilterPanel } from "@/components/RecipeFilterPanel";
import { Recipe } from "@/lib/types";
import styles from "./page.module.css";

export default function Home() {
  const { user, isLoaded } = useUser();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [clipboardPreview, setClipboardPreview] = useState<{
    title: string | null;
    thumbnailUrl: string | null;
  } | null>(null);
  const lastOfferedUrl = useRef<string | null>(null);

  // Check clipboard for a URL when the app comes to the foreground
  useEffect(() => {
    if (!user) return;

    async function checkClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        const trimmed = text?.trim();
        if (!trimmed?.match(/^https?:\/\//)) return;
        if (trimmed === lastOfferedUrl.current) return;
        setClipboardUrl(trimmed);
      } catch {
        // Clipboard access denied or unavailable — ignore silently
      }
    }

    checkClipboard();

    // visibilitychange fires before the document has focus (clipboard reads
    // fail on Chrome until focus settles). window.focus fires after focus is
    // established. Use both and deduplicate with a short debounce.
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(checkClipboard, 50);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") trigger();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", trigger);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", trigger);
      if (debounce) clearTimeout(debounce);
    };
  }, [user]);

  // Dismiss the banner when the URL is already saved
  useEffect(() => {
    if (clipboardUrl && recipes.some((r) => r.url === clipboardUrl)) {
      setClipboardUrl(null);
      lastOfferedUrl.current = clipboardUrl;
    }
  }, [recipes, clipboardUrl]);

  // Fetch preview metadata whenever a new clipboard URL is detected
  useEffect(() => {
    if (!clipboardUrl) {
      setClipboardPreview(null);
      return;
    }
    setClipboardPreview(null);
    fetch(`/api/recipes/preview?url=${encodeURIComponent(clipboardUrl)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data)
          setClipboardPreview({
            title: data.title,
            thumbnailUrl: data.thumbnailUrl,
          });
      })
      .catch(() => {});
  }, [clipboardUrl]);

  const handleSaveFromClipboard = async () => {
    if (!clipboardUrl) return;
    lastOfferedUrl.current = clipboardUrl;
    setClipboardUrl(null);
    await handleAddRecipe(clipboardUrl);
  };

  const handleDismissClipboard = () => {
    lastOfferedUrl.current = clipboardUrl;
    setClipboardUrl(null);
  };

  // Fetch recipes when user is loaded
  useEffect(() => {
    if (user?.id) {
      fetchRecipes();
    }
  }, [isLoaded, user?.id]);

  // TODO: implement paginated loading (e.g. cursor-based) so large recipe
  // collections don't load all at once — fetch a page at a time and append
  // results as the user scrolls or clicks "load more".
  const fetchRecipes = async () => {
    setIsFetching(true);
    try {
      const response = await fetch("/api/recipes");
      if (!response.ok) throw new Error("Failed to fetch recipes");
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddRecipe = async (url: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add recipe");
      }

      const newRecipe = await response.json();
      setRecipes((prev) => [newRecipe, ...prev]);
      setSelectedRecipe(newRecipe);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTags = async (recipeId: string, tags: string[]) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });

      if (!response.ok) throw new Error("Failed to update tags");

      setSelectedRecipe((prev) => (prev ? { ...prev, tags } : null));
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, tags } : r)),
      );
    } catch (error) {
      console.error("Error updating tags:", error);
      throw error;
    }
  };

  const handleUpdateMetadata = async (
    recipeId: string,
    title: string,
    url: string,
    thumbnailUrl: string | null,
    cookTime: string | null,
    servings: string | null,
    notes: string | null,
  ) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          thumbnail_url: thumbnailUrl,
          cook_time: cookTime,
          servings,
          notes,
        }),
      });

      if (!response.ok) throw new Error("Failed to update recipe");

      const updatedRecipe = await response.json();
      setSelectedRecipe(updatedRecipe);
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? updatedRecipe : r)),
      );
    } catch (error) {
      console.error("Error updating recipe:", error);
      throw error;
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete recipe");

      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      setSelectedRecipe(null);
    } catch (error) {
      console.error("Error deleting recipe:", error);
      throw error;
    }
  };

  if (!isLoaded) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user) {
    return (
      <div className={styles.landingPage}>
        <nav className={styles.landingNav}>
          <span className={styles.landingLogo}>RecipeBox</span>
          <a href="/sign-in" className={styles.navSignIn}>
            Sign in &rarr;
          </a>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>Free to use</span>
            <h1 className={styles.heroTitle}>
              Every recipe
              <br />
              you love,
              <br />
              <em>beautifully saved.</em>
            </h1>
            <p className={styles.heroSubtitle}>
              Paste any recipe URL and we&apos;ll save it instantly — title,
              photo, and source included. Tag it, search it, find it whenever
              you&apos;re ready to cook.
            </p>
            <a href="/sign-in" className={styles.ctaButton}>
              Start saving recipes
            </a>
          </div>
        </section>

        <section className={styles.featuresSection}>
          <div className={styles.featuresSectionInner}>
            <div className={styles.featuresSectionHeader}>
              <span className={styles.featuresEyebrow}>How it works</span>
              <h2 className={styles.featuresSectionTitle}>Simple by design</h2>
            </div>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <Archive size={20} />
                </div>
                <span className={styles.featureNum}>01</span>
                <h3>Save from anywhere</h3>
                <p>
                  Paste a link from any cooking site. We fetch the title, photo,
                  and source automatically.
                </p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <Tag size={20} />
                </div>
                <span className={styles.featureNum}>02</span>
                <h3>Organize with tags</h3>
                <p>
                  Build your own system. Tag by cuisine, meal type, difficulty —
                  then filter in seconds.
                </p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIconWrap}>
                  <Search size={20} />
                </div>
                <span className={styles.featureNum}>03</span>
                <h3>Find it instantly</h3>
                <p>
                  Fast search across everything you&apos;ve saved. No more
                  hunting through browser bookmarks.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.landingCta}>
          <h2>Ready to start cooking?</h2>
          <p>Build your recipe collection in minutes.</p>
          <a href="/sign-in" className={styles.ctaButton}>
            Sign in with Google
          </a>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <AppHeader />

        <RecipeFilterPanel
          recipes={recipes}
          onRecipeSelect={setSelectedRecipe}
          onRecipeDelete={handleDeleteRecipe}
          loading={isFetching}
          extraControls={
            <RecipeForm onSubmit={handleAddRecipe} isLoading={isLoading} />
          }
        />
      </div>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onTagsUpdate={handleUpdateTags}
          onMetadataUpdate={handleUpdateMetadata}
          onDelete={handleDeleteRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}

      {clipboardUrl && (
        <div className={styles.clipboardBanner}>
          <div className={styles.clipboardThumb}>
            {clipboardPreview?.thumbnailUrl ? (
              <img src={clipboardPreview.thumbnailUrl} alt="" />
            ) : (
              <Clipboard size={16} className={styles.clipboardIcon} />
            )}
          </div>
          <div className={styles.clipboardText}>
            <span className={styles.clipboardTitle}>
              {clipboardPreview?.title ?? (
                <span className={styles.clipboardTitleLoading} />
              )}
            </span>
            <span className={styles.clipboardUrl}>{clipboardUrl}</span>
          </div>
          <button
            className={styles.clipboardSaveBtn}
            onClick={handleSaveFromClipboard}
            disabled={isLoading}>
            {isLoading ? "Saving…" : "Save"}
          </button>
          <button
            className={styles.clipboardDismissBtn}
            onClick={handleDismissClipboard}
            aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
