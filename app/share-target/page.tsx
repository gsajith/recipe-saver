"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

type Status = "saving" | "saved" | "duplicate" | "error" | "no-url";

function extractUrl(
  urlParam: string | null,
  textParam: string | null,
  titleParam: string | null,
): string | null {
  // Prefer the explicit url param
  if (urlParam) return urlParam;

  // Instagram and some apps put the URL inside the text field
  if (textParam) {
    const match = textParam.match(/https?:\/\/\S+/);
    if (match) return match[0];
  }

  if (titleParam) {
    const match = titleParam.match(/https?:\/\/\S+/);
    if (match) return match[0];
  }

  return null;
}

export default function ShareTargetPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <div className={styles.card}>
            <p className={styles.statusText}>Loading...</p>
          </div>
        </div>
      }>
      <ShareTargetContent />
    </Suspense>
  );
}

function ShareTargetContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const urlParam = searchParams.get("url");
  const textParam = searchParams.get("text");
  const titleParam = searchParams.get("title");
  const sharedUrl = extractUrl(urlParam, textParam, titleParam);

  const [status, setStatus] = useState<Status>(sharedUrl ? "saving" : "no-url");
  const [errorMessage, setErrorMessage] = useState("");
  const hasSaved = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !sharedUrl || hasSaved.current) return;

    hasSaved.current = true;

    async function save() {
      try {
        const res = await fetch("/api/recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: sharedUrl }),
        });

        if (res.status === 409) {
          setStatus("duplicate");
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to save recipe");
        }

        setStatus("saved");
        // Give the user a moment to see the success state, then go home
        setTimeout(() => router.replace("/"), 1500);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong",
        );
      }
    }

    save();
  }, [isLoaded, isSignedIn, sharedUrl, router]);

  if (!isLoaded) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.statusText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    const returnUrl = `/share-target?${searchParams.toString()}`;
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Save to RecipeBox</h1>
          {sharedUrl && (
            <p className={styles.urlPreview}>
              <ExternalLink size={13} />
              <span>{sharedUrl}</span>
            </p>
          )}
          <p className={styles.statusText}>
            Sign in to save this recipe to your collection.
          </p>
          <a
            href={`/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`}
            className={styles.primaryBtn}>
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Save to RecipeBox</h1>

        {sharedUrl && (
          <p className={styles.urlPreview}>
            <ExternalLink size={13} />
            <span>{sharedUrl}</span>
          </p>
        )}

        {status === "no-url" && (
          <p className={styles.statusText}>No URL found to save.</p>
        )}

        {status === "saving" && (
          <p className={styles.statusText}>Saving recipe...</p>
        )}

        {status === "saved" && (
          <p className={`${styles.statusText} ${styles.success}`}>
            Recipe saved! Taking you to your collection...
          </p>
        )}

        {status === "duplicate" && (
          <>
            <p className={`${styles.statusText} ${styles.muted}`}>
              You&apos;ve already saved this recipe.
            </p>
            <Link href="/" className={styles.primaryBtn}>
              Go to RecipeBox
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <p className={`${styles.statusText} ${styles.error}`}>
              {errorMessage}
            </p>
            <Link href="/" className={styles.secondaryBtn}>
              Go to RecipeBox
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
