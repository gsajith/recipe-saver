"use client";

import { useEffect, useState } from "react";
import { Archive, Tag, Search, LayoutGrid, List } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { RecipeForm } from "@/components/RecipeForm";
import { AppHeader } from "@/components/AppHeader";
import { RecipeList } from "@/components/RecipeList";
import { RecipeDetail } from "@/components/RecipeDetail";
import { SearchBar } from "@/components/SearchBar";
import { RecipeWithTags } from "@/lib/types";
import styles from "./page.module.css";

export default function Home() {
  const { user, isLoaded } = useUser();
  const [recipes, setRecipes] = useState<RecipeWithTags[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<RecipeWithTags[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithTags | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [allTagsShown, setAllTagsShown] = useState(false);

  // Fetch recipes when user is loaded
  useEffect(() => {
    if (user?.id) {
      fetchRecipes();
    }
  }, [isLoaded, user?.id]);

  // Re-filter when selected tags change
  useEffect(() => {
    filterRecipes(recipes, searchQuery);
  }, [selectedTags]);

  const fetchRecipes = async () => {
    setIsFetching(true);
    try {
      const response = await fetch("/api/recipes");
      if (!response.ok) throw new Error("Failed to fetch recipes");
      const data = await response.json();
      setRecipes(data);
      filterRecipes(data, searchQuery);
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const filterRecipes = (recipesList: RecipeWithTags[], query: string) => {
    let filtered = recipesList;

    // Apply search filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter((recipe) => {
        const matchesTitle = recipe.title.toLowerCase().includes(lowerQuery);
        const matchesTags = recipe.tags?.some((tag) =>
          tag.toLowerCase().includes(lowerQuery),
        );
        return matchesTitle || matchesTags;
      });
    }

    // Apply tag filters (AND logic - recipe must have all selected tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((recipe) =>
        selectedTags.every((tag) => recipe.tags?.includes(tag)),
      );
    }

    setFilteredRecipes(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    filterRecipes(recipes, query);
  };

  const getAvailableTags = (): Array<[string, number]> => {
    // Get all tags from recipes after search filter but before tag filter
    let tagsMap: { [key: string]: number } = {};

    let searchFiltered = recipes;
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      searchFiltered = recipes.filter((recipe) => {
        const matchesTitle = recipe.title.toLowerCase().includes(lowerQuery);
        const matchesTags = recipe.tags?.some((tag) =>
          tag.toLowerCase().includes(lowerQuery),
        );
        return matchesTitle || matchesTags;
      });
    }

    // Apply current tag filters and count available tags
    let tagFiltered = searchFiltered;
    if (selectedTags.length > 0) {
      tagFiltered = searchFiltered.filter((recipe) =>
        selectedTags.every((tag) => recipe.tags?.includes(tag)),
      );
    }

    // Count tags that would still have recipes if selected
    tagFiltered.forEach((recipe) => {
      recipe.tags?.forEach((tag) => {
        tagsMap[tag] = (tagsMap[tag] || 0) + 1;
      });
    });

    // Sort by count descending
    return Object.entries(tagsMap).sort((a, b) => b[1] - a[1]);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
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
      const updatedRecipes = [newRecipe, ...recipes];
      setRecipes(updatedRecipes);
      filterRecipes(updatedRecipes, searchQuery);
      setSelectedRecipe(newRecipe);
    } catch (error) {
      throw error;
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

      // Update the selected recipe
      setSelectedRecipe((prev) => (prev ? { ...prev, tags } : null));

      // Update recipes list and filtered list
      setRecipes((prev) => {
        const updated = prev.map((r) =>
          r.id === recipeId ? { ...r, tags } : r,
        );
        filterRecipes(updated, searchQuery);
        return updated;
      });
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

      // Update the selected recipe
      setSelectedRecipe(updatedRecipe);

      // Update recipes list and filter
      setRecipes((prev) => {
        const updated = prev.map((r) =>
          r.id === recipeId ? updatedRecipe : r,
        );
        filterRecipes(updated, searchQuery);
        return updated;
      });
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

      const updatedRecipes = recipes.filter((r) => r.id !== recipeId);
      setRecipes(updatedRecipes);
      filterRecipes(updatedRecipes, searchQuery);
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
          <span className={styles.landingLogo}>Recipe Box</span>
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

        <div className={styles.searchBarContainer}>
          <SearchBar onSearch={handleSearch} />
          <div className={styles.viewToggle}>
            <button
              onClick={() => setViewMode("grid")}
              className={`${styles.viewToggleBtn} ${
                viewMode === "grid" ? styles.viewToggleBtnActive : ""
              }`}
              title="Grid view">
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`${styles.viewToggleBtn} ${
                viewMode === "list" ? styles.viewToggleBtnActive : ""
              }`}
              title="List view">
              <List size={16} />
            </button>
          </div>
          <RecipeForm onSubmit={handleAddRecipe} isLoading={isLoading} />
        </div>

        {getAvailableTags().length > 0 && (
          <div className={styles.tagsFilter}>
            <div className={styles.tagsFilterContent}>
              {getAvailableTags()
                .filter((tag, index) => allTagsShown || index < 8)
                .map(([tag]) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`${styles.tagFilterBtn} ${
                      selectedTags.includes(tag)
                        ? styles.tagFilterBtnActive
                        : ""
                    }`}>
                    {tag}
                  </button>
                ))}
              {!allTagsShown && (
                <button
                  key="showAll"
                  className={`${styles.tagFilterBtn} ${styles.showAllBtn}`}
                  onClick={() => setAllTagsShown((prev) => !prev)}>
                  ... show all tags
                </button>
              )}
            </div>
          </div>
        )}

        {isFetching ? (
          <div className={styles.loading}>Loading recipes...</div>
        ) : (
          <RecipeList
            recipes={filteredRecipes}
            onRecipeSelect={setSelectedRecipe}
            onRecipeDelete={handleDeleteRecipe}
            viewMode={viewMode}
          />
        )}
      </div>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onTagsUpdate={handleUpdateTags}
          onMetadataUpdate={handleUpdateMetadata}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}
