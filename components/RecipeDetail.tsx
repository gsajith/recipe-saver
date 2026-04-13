"use client";

import { useState, useRef } from "react";
import { X, Edit2, Link as LinkIcon } from "lucide-react";
import { RecipeWithTags } from "@/lib/types";
import styles from "./RecipeDetail.module.css";

interface RecipeDetailProps {
  recipe: RecipeWithTags;
  onTagsUpdate: (recipeId: string, tags: string[]) => Promise<void>;
  onMetadataUpdate?: (
    recipeId: string,
    title: string,
    thumbnailUrl: string | null,
  ) => Promise<void>;
  onClose: () => void;
}

export function RecipeDetail({
  recipe,
  onTagsUpdate,
  onMetadataUpdate,
  onClose,
}: RecipeDetailProps) {
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(recipe.tags || []);
  const [title, setTitle] = useState(recipe.title);
  const [thumbnailUrl, setThumbnailUrl] = useState(recipe.thumbnail_url || "");
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const mealTypeTags = [
    "breakfast",
    "lunch",
    "dinner",
    "dessert",
    "snack",
    "ingredient",
  ];
  const difficultyTags = ["easy", "medium", "hard"];

  const handleAddTag = async () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      const updatedTags = [...tags, newTag];
      setTags(updatedTags);
      setTagInput("");
      setIsSaving(true);
      try {
        await onTagsUpdate(recipe.id, updatedTags);
      } finally {
        setIsSaving(false);
        tagInputRef.current?.focus();
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags);
    setIsSaving(true);
    try {
      await onTagsUpdate(recipe.id, updatedTags);
    } finally {
      setIsSaving(false);
      tagInputRef.current?.focus();
    }
  };

  const handleAddSuggestedTag = async (tag: string) => {
    if (!tags.includes(tag)) {
      const updatedTags = [...tags, tag];
      setTags(updatedTags);
      setIsSaving(true);
      try {
        await onTagsUpdate(recipe.id, updatedTags);
      } finally {
        setIsSaving(false);
        tagInputRef.current?.focus();
      }
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleAddTag();
    }
  };

  const handleSaveMetadata = async () => {
    if (!onMetadataUpdate) return;
    setIsSaving(true);
    try {
      await onMetadataUpdate(recipe.id, title, thumbnailUrl || null);
      setIsEditingMetadata(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} title="Close">
          <X size={20} />
        </button>

        <div className={styles.header}>
          {recipe.thumbnail_url && (
            <img
              src={recipe.thumbnail_url}
              alt={recipe.title}
              className={styles.headerImage}
            />
          )}
        </div>

        <div className={styles.content}>
          {isEditingMetadata ? (
            <div className={styles.editSection}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Thumbnail URL</label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className={styles.input}
                  placeholder="Leave empty for no thumbnail"
                />
                {thumbnailUrl && (
                  <div className={styles.thumbnailPreview}>
                    <img src={thumbnailUrl} alt="Thumbnail preview" />
                  </div>
                )}
              </div>
              <div className={styles.buttonGroup}>
                <button
                  onClick={handleSaveMetadata}
                  className={styles.saveBtn}
                  disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setIsEditingMetadata(false);
                    setTitle(recipe.title);
                    setThumbnailUrl(recipe.thumbnail_url || "");
                  }}
                  className={styles.cancelBtn}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.titleRow}>
                <h2>{title}</h2>
                <button
                  onClick={() => setIsEditingMetadata(true)}
                  className={styles.editBtn}
                  title="Edit title and thumbnail">
                  <Edit2 size={20} />
                </button>
              </div>
            </>
          )}
          <a
            href={recipe.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}>
            <LinkIcon size={16} />
            <span>View Original Recipe</span>
          </a>

          <div className={styles.tagsSection}>
            <div className={styles.tagsInput}>
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag..."
                className={styles.input}
                disabled={isSaving}
              />
            </div>

            <div className={styles.tagsList}>
              {tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className={styles.removeTagBtn}
                    title="Remove tag"
                    disabled={isSaving}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>

            <div className={styles.suggestionsSection}>
              <div className={styles.suggestionGroup}>
                <p className={styles.suggestionLabel}>Meal Type</p>
                <div className={styles.suggestionsRow}>
                  {mealTypeTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddSuggestedTag(tag)}
                      className={`${styles.suggestionBtn} ${
                        tags.includes(tag) ? styles.suggestionBtnActive : ""
                      }`}
                      disabled={isSaving}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.suggestionGroup}>
                <p className={styles.suggestionLabel}>Difficulty</p>
                <div className={styles.suggestionsRow}>
                  {difficultyTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleAddSuggestedTag(tag)}
                      className={`${styles.suggestionBtn} ${
                        tags.includes(tag) ? styles.suggestionBtnActive : ""
                      }`}
                      disabled={isSaving}>
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
