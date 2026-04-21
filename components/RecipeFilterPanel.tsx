"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { RecipeList } from "@/components/RecipeList";
import type { RecipeWithTags } from "@/lib/types";
import styles from "./RecipeFilterPanel.module.css";

interface RecipeFilterPanelProps {
  recipes: RecipeWithTags[];
  onRecipeSelect: (recipe: RecipeWithTags) => void;
  onRecipeDelete?: (recipeId: string) => Promise<void>;
  theme?: "light" | "inverted";
  /** Extra content rendered at the end of the controls row (e.g. RecipeForm) */
  extraControls?: React.ReactNode;
  loading?: boolean;
  /** Hide the per-card delete button (for read-only views) */
  hideDeleteButton?: boolean;
  /** Extra className merged onto the controls row (e.g. for slide-in animation) */
  controlsClassName?: string;
  /** Extra className merged onto the tags filter row (e.g. for slide-in animation) */
  tagsFilterClassName?: string;
}

export function RecipeFilterPanel({
  recipes,
  onRecipeSelect,
  onRecipeDelete,
  theme = "light",
  extraControls,
  loading,
  hideDeleteButton,
  controlsClassName,
  tagsFilterClassName,
}: RecipeFilterPanelProps) {
  const [filteredRecipes, setFilteredRecipes] = useState(recipes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [allTagsShown, setAllTagsShown] = useState(false);

  // Re-filter whenever the source list or selected tags change
  useEffect(() => {
    filterRecipes(recipes, searchQuery);
  }, [recipes, selectedTags]); // eslint-disable-line react-hooks/exhaustive-deps

  function filterRecipes(recipesList: RecipeWithTags[], query: string) {
    let filtered = recipesList;
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(lowerQuery) ||
          r.tags?.some((t) => t.toLowerCase().includes(lowerQuery)),
      );
    }
    if (selectedTags.length > 0) {
      filtered = filtered.filter((r) =>
        selectedTags.every((t) => r.tags?.includes(t)),
      );
    }
    setFilteredRecipes(filtered);
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    filterRecipes(recipes, query);
  }

  function handleTagToggle(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function getAvailableTags(): Array<[string, number]> {
    const map: Record<string, number> = {};
    filteredRecipes.forEach((r) =>
      r.tags?.forEach((t) => {
        map[t] = (map[t] || 0) + 1;
      }),
    );
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }

  const availableTags = getAvailableTags();
  const isInverted = theme === "inverted";

  return (
    <div className={isInverted ? styles.invertedTheme : undefined}>
      <div className={`${styles.controls} ${controlsClassName ?? ""}`}>
        <SearchBar onSearch={handleSearch} />
        <div className={styles.viewToggle}>
          <button
            onClick={(e) => { e.stopPropagation(); setViewMode("grid"); }}
            className={`${styles.viewToggleBtn} ${viewMode === "grid" ? styles.viewToggleBtnActive : ""}`}
            title="Grid view">
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setViewMode("list"); }}
            className={`${styles.viewToggleBtn} ${viewMode === "list" ? styles.viewToggleBtnActive : ""}`}
            title="List view">
            <List size={16} />
          </button>
        </div>
        {extraControls}
      </div>

      {availableTags.length > 0 && (
        <div className={`${styles.tagsFilter} ${tagsFilterClassName ?? ""}`}>
          <div className={styles.tagsFilterContent}>
            {availableTags
              .filter((_, idx) => allTagsShown || idx < 8)
              .map(([tag]) => (
                <button
                  key={tag}
                  onClick={(e) => { e.stopPropagation(); handleTagToggle(tag); }}
                  className={`${styles.tagFilterBtn} ${selectedTags.includes(tag) ? styles.tagFilterBtnActive : ""}`}>
                  {tag}
                </button>
              ))}
            {!allTagsShown && availableTags.length > 8 && (
              <button
                className={`${styles.tagFilterBtn} ${styles.showAllBtn}`}
                onClick={(e) => { e.stopPropagation(); setAllTagsShown(true); }}>
                … show all tags
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingText}>Loading recipes...</div>
      ) : (
        <div
          className={hideDeleteButton ? styles.hideDelete : undefined}
          onClick={(e) => e.stopPropagation()}>
          <RecipeList
            recipes={filteredRecipes}
            onRecipeSelect={onRecipeSelect}
            onRecipeDelete={onRecipeDelete ?? (async () => {})}
            viewMode={viewMode}
          />
        </div>
      )}
    </div>
  );
}
