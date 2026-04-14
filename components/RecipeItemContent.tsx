"use client";

import { Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { RecipeWithTags } from "@/lib/types";
import styles from "./RecipeList.module.css";

interface RecipeItemContentProps {
  recipe: RecipeWithTags;
  onDelete: (recipeId: string) => Promise<void>;
  deletingId: string | null;
  viewMode: "grid" | "list";
}

export function RecipeItemContent({
  recipe,
  onDelete,
  deletingId,
  viewMode,
}: RecipeItemContentProps) {
  const handleDelete = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    await onDelete(recipe.id);
  };

  return (
    <>
      {recipe.thumbnail_url && (
        viewMode === "list" ? (
          <div className={styles.thumbnailListWrapper}>
            <img
              src={recipe.thumbnail_url}
              alt={recipe.title}
              className={`${styles.thumbnail} ${styles.thumbnailList}`}
            />
          </div>
        ) : (
          <img
            src={recipe.thumbnail_url}
            alt={recipe.title}
            className={styles.thumbnail}
          />
        )
      )}

      <div
        className={`${styles.content} ${
          viewMode === "list" ? styles.contentList : ""
        }`}>
        <h3
          className={`${styles.title} ${
            viewMode === "list" ? styles.titleList : ""
          }`}>
          {recipe.title}
        </h3>
        {recipe.tags && recipe.tags.length > 0 && (
          <div
            className={`${styles.tags} ${
              viewMode === "list" ? styles.tagsList : ""
            }`}>
            {recipe.tags
              .filter((tag, index) => viewMode === "list" || index < 2)
              .map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                </span>
              ))}
            {recipe.tags.length > 2 && viewMode !== "list" && (
              <span className={styles.tag}>+{recipe.tags.length - 2} more</span>
            )}
          </div>
        )}
      </div>

      <button
        className={styles.deleteBtn}
        onClick={handleDelete}
        disabled={deletingId === recipe.id}
        title="Delete recipe">
        <Trash2 size={18} />
      </button>
    </>
  );
}
