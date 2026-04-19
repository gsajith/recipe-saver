"use client";

import { useState, useRef, useEffect } from "react";
import { X, Edit2, ExternalLink, Clock, Users, RefreshCw } from "lucide-react";
import { RecipeWithTags } from "@/lib/types";
import styles from "./RecipeDetail.module.css";

interface RecipeDetailProps {
  recipe: RecipeWithTags;
  onTagsUpdate: (recipeId: string, tags: string[]) => Promise<void>;
  onMetadataUpdate?: (
    recipeId: string,
    title: string,
    thumbnailUrl: string | null,
    cookTime: string | null,
    servings: string | null,
  ) => Promise<void>;
  onNotesUpdate?: (recipeId: string, notes: string) => Promise<void>;
  onClose: () => void;
}

export function RecipeDetail({
  recipe,
  onTagsUpdate,
  onMetadataUpdate,
  onNotesUpdate,
  onClose,
}: RecipeDetailProps) {
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(recipe.tags || []);
  const [title, setTitle] = useState(recipe.title);
  const [thumbnailUrl, setThumbnailUrl] = useState(recipe.thumbnail_url || "");
  const [cookTime, setCookTime] = useState(recipe.cook_time || "");
  const [servings, setServings] = useState(recipe.servings || "");
  const [notes, setNotes] = useState(recipe.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesSaveStatus, setNotesSaveStatus] = useState<"" | "saving" | "saved">("");
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync all state when recipe changes
  useEffect(() => {
    setTitle(recipe.title);
    setThumbnailUrl(recipe.thumbnail_url || "");
    setCookTime(recipe.cook_time || "");
    setServings(recipe.servings || "");
    setNotes(recipe.notes || "");
    setTags(recipe.tags || []);
  }, [
    recipe.id,
    recipe.title,
    recipe.thumbnail_url,
    recipe.cook_time,
    recipe.servings,
    recipe.notes,
  ]);

  const handleSaveNotes = async () => {
    setIsEditingNotes(false);
    if (!onNotesUpdate) return;
    setNotesSaveStatus("saving");
    try {
      await onNotesUpdate(recipe.id, notes);
      setNotesSaveStatus("saved");
      setTimeout(() => setNotesSaveStatus(""), 1500);
    } catch {
      setNotesSaveStatus("");
    }
  };

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
      await onMetadataUpdate(
        recipe.id,
        title,
        thumbnailUrl || null,
        cookTime || null,
        servings || null,
      );
      setIsEditingMetadata(false);
    } finally {
      setIsSaving(false);
    }
  };

  const displayCookTime = cookTime || "";
  const displayServings = servings || "";

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
                <div className={styles.thumbnailInputRow}>
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
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cook Time</label>
                <input
                  type="text"
                  value={cookTime}
                  onChange={(e) => setCookTime(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. 30 min, 1 hr 15 min"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Servings</label>
                <input
                  type="text"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. 4, 4-6 servings"
                />
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
                    setCookTime(recipe.cook_time || "");
                    setServings(recipe.servings || "");
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
                  <Edit2 size={16} />
                </button>
              </div>
              {(displayCookTime || displayServings) && (
                <div className={styles.metaRow}>
                  {displayCookTime && (
                    <span className={styles.metaItem}>
                      <Clock size={12} />
                      {displayCookTime}
                    </span>
                  )}
                  {displayCookTime && displayServings && (
                    <span className={styles.metaDot}>·</span>
                  )}
                  {displayServings && (
                    <span className={styles.metaItem}>
                      <Users size={12} />
                      {displayServings}
                    </span>
                  )}
                </div>
              )}
              <a
                href={recipe.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sourceLink}>
                <ExternalLink size={12} />
                {new URL(recipe.url).hostname.replace(/^www\./, "")}
              </a>
              <hr className={styles.divider} />
            </>
          )}

          {isEditingNotes ? (
            <div className={styles.notesSection}>
              <textarea
                autoFocus
                className={styles.notesTextarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                onKeyDown={(e) => {
                  if (e.key === "Escape") handleSaveNotes();
                }}
                placeholder="Add adjustments, substitutions, or personal notes…"
                rows={3}
              />
            </div>
          ) : notes ? (
            <div className={styles.notesSection}>
              <button
                className={styles.notesDisplay}
                onClick={() => setIsEditingNotes(true)}
                title="Edit note">
                <span className={styles.notesLabel}>Notes</span>
                <span className={styles.notesText}>{notes}</span>
                {notesSaveStatus === "saving" && (
                  <span className={styles.notesSaveStatus}>Saving…</span>
                )}
              </button>
            </div>
          ) : (
            <button
              className={styles.addNoteBtn}
              onClick={() => setIsEditingNotes(true)}>
              + Add a note
            </button>
          )}

          <div className={styles.tagsSection}>
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

            <hr className={styles.divider} />

            <div className={styles.tagsInput}>
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyPress}
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
          </div>
        </div>
      </div>
    </div>
  );
}
