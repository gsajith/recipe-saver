"use client";

import { useState } from "react";
import { Recipe } from "@/lib/types";
import { RecipeCardView } from "./RecipeCardView";
import { RecipeListView } from "./RecipeListView";
import styles from "./RecipeList.module.css";

interface RecipeListProps {
  recipes: Recipe[];
  onRecipeSelect: (recipe: Recipe) => void;
  onRecipeDelete: (recipeId: string) => Promise<void>;
  viewMode?: "grid" | "list";
}

export function RecipeList({
  recipes,
  onRecipeSelect,
  onRecipeDelete,
  viewMode = "grid",
}: RecipeListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (recipeId: string) => {
    setDeletingId(recipeId);
    try {
      await onRecipeDelete(recipeId);
    } finally {
      setDeletingId(null);
    }
  };

  if (recipes.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No recipes saved yet. Add your first recipe!</p>
      </div>
    );
  }

  return viewMode === "list" ? (
    <RecipeListView
      recipes={recipes}
      onRecipeSelect={onRecipeSelect}
      onDelete={handleDelete}
      deletingId={deletingId}
    />
  ) : (
    <RecipeCardView
      recipes={recipes}
      onRecipeSelect={onRecipeSelect}
      onDelete={handleDelete}
      deletingId={deletingId}
    />
  );
}
