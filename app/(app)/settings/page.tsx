"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./page.module.css";

type CheckState = "idle" | "checking" | "available" | "unavailable" | "invalid";

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [checkState, setCheckState] = useState<CheckState>("idle");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const debouncedUsername = useDebouncedValue(username, 400);
  const checkController = useRef<AbortController | null>(null);

  // Load current profile
  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.username) {
          setUsername(data.username);
          setInitialUsername(data.username);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  // Check username availability when debounced value changes
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

  const canSave =
    !loadingProfile &&
    !saving &&
    (checkState === "available" ||
      checkState === "idle" ||
      username.trim() === initialUsername);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save");
        return;
      }
      const data = await res.json();
      setInitialUsername(data.username ?? "");
      setSaved(true);
    } catch {
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const usernameHint = () => {
    if (username.trim() === initialUsername) return null;
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

  const inputClass = (state: CheckState, changed: boolean) => {
    if (!changed) return styles.input;
    if (state === "available") return `${styles.input} ${styles.inputOk}`;
    if (state === "unavailable" || state === "invalid")
      return `${styles.input} ${styles.inputError}`;
    return styles.input;
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      {errorParam === "username-required" && (
        <p className={styles.errorBanner}>
          You need to set a username before you can view your profile.
        </p>
      )}

      <form className={styles.section} onSubmit={handleSave}>
        <h2 className={styles.sectionTitle}>Public profile</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="username">
            Username
          </label>
          <div className={styles.inputWrap}>
            <span className={styles.prefix}>@</span>
            <input
              id="username"
              className={`${inputClass(checkState, username.trim() !== initialUsername)} ${styles.inputWithPrefix}`}
              type="text"
              value={username}
              onChange={(e) => {
                setSaved(false);
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                );
              }}
              placeholder="your_username"
              maxLength={20}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <div className={styles.hint}>{usernameHint()}</div>
        </div>

        <button type="submit" className={styles.saveBtn} disabled={!canSave}>
          {saving ? "Saving…" : "Save"}
        </button>

        {saved && (
          <p className={styles.successMsg}>
            Profile saved!{" "}
            {initialUsername && (
              <Link
                href={`/user/${initialUsername}`}
                className={styles.profileLink}>
                View your profile →
              </Link>
            )}
          </p>
        )}
      </form>
    </div>
  );
}
