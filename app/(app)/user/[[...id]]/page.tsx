"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FollowButton } from "@/components/FollowButton";
import styles from "./page.module.css";
import type { RecipeWithTags } from "@/lib/types";

interface ProfileData {
  id: string;
  username: string;
  clerk_user_id: string;
  follower_count: number;
  following_count: number;
}

const MAX_FAN = 5;

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const params = useParams<{ id?: string[] }>();
  const targetUsername = params.id?.[0] ?? null;

  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [recipes, setRecipes] = useState<RecipeWithTags[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.username) setMyUsername(data.username);
      })
      .catch(() => {});
  }, []);

  const displayUsername = targetUsername ?? myUsername;

  useEffect(() => {
    if (!displayUsername) {
      if (myUsername !== null || !targetUsername) setLoading(false);
      return;
    }

    setLoading(true);

    const fetches: Promise<unknown>[] = [
      fetch(`/api/users/${displayUsername}`).then((r) => r.json()),
      fetch(`/api/users/${displayUsername}/recipes`).then((r) => r.json()),
    ];

    if (targetUsername) {
      fetches.push(
        fetch(`/api/users/${displayUsername}/follow`).then((r) => r.json()),
      );
    }

    Promise.all(fetches)
      .then(([profileData, recipesData, followData]) => {
        const p = profileData as ProfileData & { error?: string };
        if (!p.error) setProfile(p);
        if (Array.isArray(recipesData))
          setRecipes(recipesData as RecipeWithTags[]);
        if (followData) {
          const f = followData as { isFollowing?: boolean };
          setIsFollowing(!!f.isFollowing);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [displayUsername, targetUsername]);

  if (!isLoaded || loading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  const isOwnProfile = !targetUsername || targetUsername === myUsername;
  const displayName =
    isOwnProfile && user
      ? user.fullName || user.firstName || myUsername || ""
      : displayUsername || "";
  const avatarUrl = isOwnProfile && user ? user.imageUrl : null;

  const followerCount = profile?.follower_count ?? 0;
  const followingCount = profile?.following_count ?? 0;
  const recipeCount = recipes.length;

  const fanRecipes = recipes.slice(0, MAX_FAN);
  const extraCount = Math.max(0, recipeCount - MAX_FAN);
  const fanTotal = fanRecipes.length + (extraCount > 0 ? 1 : 0);

  const avatarEl = avatarUrl ? (
    <img src={avatarUrl} alt={displayName} className={styles.avatarImg} />
  ) : (
    <div className={styles.avatarInitial}>
      {(displayName?.[0] || "?").toUpperCase()}
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Mobile only: name + stats shown above the arch card */}
      <div className={styles.mobileHeader}>
        <h1 className={styles.mobileHeaderName}>{displayName}</h1>
        <div className={styles.mobileHeaderStats}>
          <span className={styles.mobileStatBold}>{followerCount}</span>
          <span className={styles.mobileStatLabel}> followers</span>
          <span className={styles.mobileStatSep}>&nbsp;&nbsp;</span>
          <span className={styles.mobileStatCount}>{followingCount}</span>
          <span className={styles.mobileStatLabel}> following</span>
        </div>
      </div>

      <div className={styles.topRowContainer}>
        <div className={styles.avatarContainer}>{avatarEl}</div>
        <div className={styles.profileCard}>
          <div className={styles.cardInfo}>
            <h1 className={styles.name}>{displayName}</h1>
            <div className={styles.stats}>
              <span className={styles.statCount}>{followerCount}</span>
              <span className={styles.statLabel}> followers</span>
              &nbsp;&nbsp;
              <span className={styles.statCount}>{followingCount}</span>
              <span className={styles.statLabel}> following</span>
            </div>
            {!isOwnProfile && profile && (
              <div className={styles.followWrap}>
                <FollowButton
                  username={displayUsername!}
                  initialIsFollowing={isFollowing}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div>
        {/* BOTTOM ROW — badge (left) + fan cards (right) */}
        <div className={styles.bottomRow}>
          <div className={styles.recipesContainer}>
            <div className={styles.recipesBadge}>
              {recipeCount} recipe{recipeCount !== 1 ? "s" : ""} saved
            </div>
            {fanRecipes.length > 0 && (
              <div
                className={styles.recipeFan}
                style={{ "--fan-total": fanTotal } as React.CSSProperties}>
                {fanRecipes.map((recipe, i) => (
                  <div
                    key={recipe.id}
                    className={styles.fanCard}
                    style={
                      {
                        "--i": i,
                        "--fan-total": fanTotal,
                      } as React.CSSProperties
                    }>
                    {recipe.thumbnail_url ? (
                      <img
                        src={recipe.thumbnail_url}
                        alt={recipe.title}
                        className={styles.fanThumb}
                      />
                    ) : (
                      <div className={styles.fanThumbPlaceholder} />
                    )}
                  </div>
                ))}
                {extraCount > 0 && (
                  <div
                    className={`${styles.fanCard} ${styles.fanMore}`}
                    style={
                      {
                        "--i": fanRecipes.length,
                        "--fan-total": fanTotal,
                      } as React.CSSProperties
                    }>
                    +{extraCount}
                    <br />
                    more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile only: follow button below card */}
      {!isOwnProfile && profile && (
        <div className={styles.mobileFollowWrap}>
          <FollowButton
            username={displayUsername!}
            initialIsFollowing={isFollowing}
          />
        </div>
      )}
    </div>
  );
}
