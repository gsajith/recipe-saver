"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { RecipeWithTags } from "@/lib/types";
import styles from "./RecipeList.module.css";

interface RecipeListProps {
  recipes: RecipeWithTags[];
  onRecipeSelect: (recipe: RecipeWithTags) => void;
  onRecipeDelete: (recipeId: string) => Promise<void>;
}

export function RecipeList({
  recipes,
  onRecipeSelect,
  onRecipeDelete,
}: RecipeListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this recipe?")) return;

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

  return (
    <div className={styles.container}>
      <div className={styles.recipeGrid}>
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className={styles.recipeCard}
            onClick={() => onRecipeSelect(recipe)}>
            {recipe.thumbnail_url && (
              <img
                src={recipe.thumbnail_url}
                alt={recipe.title}
                className={styles.thumbnail}
              />
            )}
            <div className={styles.content}>
              <h3 className={styles.title}>{recipe.title}</h3>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className={styles.tags}>
                  {recipe.tags
                    .filter((tag, index) => index < 2)
                    .map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  {recipe.tags.length > 2 && (
                    <span className={styles.tag}>
                      +{recipe.tags.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              className={styles.deleteBtn}
              onClick={(e) => handleDelete(e, recipe.id)}
              disabled={deletingId === recipe.id}
              title="Delete recipe">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
