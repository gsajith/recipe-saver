"use client";

import { Recipe } from "@/lib/types";
import { RecipeItemContent } from "./RecipeItemContent";
import styles from "./RecipeList.module.css";

interface RecipeListViewProps {
  recipes: Recipe[];
  onRecipeSelect: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => Promise<void>;
  deletingId: string | null;
}

export function RecipeListView({
  recipes,
  onRecipeSelect,
  onDelete,
  deletingId,
}: RecipeListViewProps) {
  return (
    <div className={styles.container}>
      <div className={`${styles.recipeGrid} ${styles.recipeList}`}>
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className={`${styles.recipeCard} ${styles.recipeCardList}`}
            onClick={() => onRecipeSelect(recipe)}>
            <RecipeItemContent
              recipe={recipe}
              onDelete={onDelete}
              deletingId={deletingId}
              viewMode="list"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
