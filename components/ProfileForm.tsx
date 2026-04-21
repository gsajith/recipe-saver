"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Camera, X } from "lucide-react";
import { CropModal } from "./CropModal";
import styles from "./ProfileForm.module.css";

type CheckState = "idle" | "checking" | "available" | "unavailable" | "invalid";

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface ProfileFormProps {
  /** Pre-populated values; omit or pass "" for new users. */
  initialUsername?: string;
  initialDisplayName?: string;
  /** Text shown on the submit button. */
  submitLabel: string;
  /** True while the parent is loading initial data (disables submit). */
  loading?: boolean;
  /** Called after a successful save with the server-returned values. */
  onSuccess: (data: { username: string; display_name: string | null }) => void;
  /** Rendered below the submit button (e.g. a "View profile" link). */
  footer?: React.ReactNode;
  /** Applied to the <form> element (e.g. for page-specific card styling). */
  className?: string;
}

export function ProfileForm({
  initialUsername = "",
  initialDisplayName = "",
  submitLabel,
  loading = false,
  onSuccess,
  footer,
  className,
}: ProfileFormProps) {
  const { user } = useUser();
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkController = useRef<AbortController | null>(null);

  // Clean up object URLs on unmount or when they change
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  // Sync state when parent provides initial values after an async load
  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  const debouncedUsername = useDebouncedValue(username, 400);

  useEffect(() => {
    const trimmed = debouncedUsername.trim();
    if (!trimmed || trimmed === initialUsername) {
      setCheckState("idle");
      return;
    }

    checkController.current?.abort();
    const controller = new AbortController();
    checkController.current = controller;

    setCheckState("checking");
    fetch(`/api/users/check?username=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.reason === "invalid") setCheckState("invalid");
        else setCheckState(data.available ? "available" : "unavailable");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setCheckState("idle");
      });
  }, [debouncedUsername, initialUsername]);

  const usernameChanged = username.trim() !== initialUsername;
  const displayNameChanged = displayName.trim() !== initialDisplayName;
  // New users (no initialUsername) always count as having changes once they type
  const hasChanges =
    usernameChanged ||
    displayNameChanged ||
    !initialUsername ||
    photoFile !== null ||
    removePhoto;

  const canSubmit =
    !loading &&
    !saving &&
    hasChanges &&
    username.trim().length > 0 &&
    (checkState === "available" || username.trim() === initialUsername);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected after cancelling
    e.target.value = "";
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
  };

  const handleCropConfirm = (croppedFile: File) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(croppedFile);
    setPhotoPreview(URL.createObjectURL(croppedFile));
    setRemovePhoto(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleRemovePhoto = () => {
    if (photoFile) {
      // Just cancel the pending upload — revert to the saved Clerk photo
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoFile(null);
      setPhotoPreview(null);
    } else {
      setRemovePhoto(true);
    }
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      if (removePhoto && user) {
        await user.setProfileImage({ file: null });
      } else if (photoFile && user) {
        await user.setProfileImage({ file: photoFile });
      }
      const res = await fetch("/api/users/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          display_name: displayName.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save profile");
        return;
      }
      const data = await res.json();
      onSuccess(data);
    } catch {
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Show hint when the username differs from its initial value (always for new users)
  const showUsernameHint = !initialUsername || usernameChanged;

  const usernameHint = () => {
    if (!showUsernameHint) return null;
    switch (checkState) {
      case "checking":
        return <span className={styles.hint}>Checking…</span>;
      case "available":
        return <span className={styles.hintOk}>✓ Available</span>;
      case "unavailable":
        return <span className={styles.hintError}>✗ Already taken</span>;
      case "invalid":
        return (
          <span className={styles.hintError}>
            ✗ Invalid — 3–20 chars, lowercase letters, numbers, underscores only
          </span>
        );
      default:
        return (
          <span className={styles.hint}>
            3–20 chars, lowercase letters, numbers, underscores only
          </span>
        );
    }
  };

  const usernameInputClass = () => {
    if (!usernameChanged) return styles.input;
    if (checkState === "available") return `${styles.input} ${styles.inputOk}`;
    if (checkState === "unavailable" || checkState === "invalid")
      return `${styles.input} ${styles.inputError}`;
    return styles.input;
  };

  const savedImageUrl = user?.imageUrl ?? null;
  const avatarSrc = photoPreview ?? savedImageUrl;
  const avatarInitial = (displayName || username || "?")[0].toUpperCase();
  // Only offer remove when there's an actual custom photo (not just Clerk's generated default)
  const hasCustomPhoto = photoFile !== null || (user?.hasImage ?? false);
  const canRemove = !removePhoto && hasCustomPhoto;

  return (
    <>
      {cropSrc && (
        <CropModal
          imageSrc={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
      <form className={className} onSubmit={handleSubmit}>
        <div className={styles.avatarSection}>
          <button
            type="button"
            className={`${styles.avatarBtn}${removePhoto ? ` ${styles.avatarBtnRemoving}` : ""}`}
            onClick={() => !removePhoto && fileInputRef.current?.click()}
            aria-label="Change profile photo">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarInitial}>{avatarInitial}</div>
            )}
            {removePhoto ? (
              <div
                className={`${styles.avatarOverlay} ${styles.avatarOverlayRemove}`}>
                <X size={28} />
              </div>
            ) : (
              <div className={styles.avatarOverlay}>
                <Camera size={32} />
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.avatarInput}
            onChange={handlePhotoChange}
          />
          {!removePhoto && (
            <span className={styles.avatarHint}>
              Click to change photo
            </span>
          )}
          <div className={styles.avatarActions}>
            {canRemove && (
              <button
                type="button"
                className={styles.avatarActionBtn}
                onClick={handleRemovePhoto}>
                Remove photo
              </button>
            )}
            {removePhoto && (
              <button
                type="button"
                className={`${styles.avatarActionBtn} ${styles.avatarActionBtnUndo}`}
                onClick={() => setRemovePhoto(false)}>
                Undo remove photo
              </button>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="username">
            Username
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.prefix}>@</span>
            <input
              id="username"
              className={`${usernameInputClass()} ${styles.inputWithPrefix}`}
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              placeholder="your_username"
              maxLength={20}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <div>{usernameHint()}</div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="displayName">
            Display name{" "}
            <span className={styles.labelOptional}>(optional)</span>
          </label>
          <input
            id="displayName"
            className={styles.input}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            autoComplete="off"
            spellCheck={false}
          />
          <span className={styles.hint}>Shown on your profile page.</span>
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!canSubmit}>
          {saving ? "Saving…" : submitLabel}
        </button>

        {footer}
      </form>
    </>
  );
}
