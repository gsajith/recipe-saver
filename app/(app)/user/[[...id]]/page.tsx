"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { RecipeFilterPanel } from "@/components/RecipeFilterPanel";
import styles from "./page.module.css";
import recipeStyles from "@/components/RecipeList.module.css";
import type { Recipe } from "@/lib/types";

interface ProfileData {
  id: string;
  username: string;
  clerk_user_id: string;
  follower_count: number;
  following_count: number;
  image_url: string | null;
  display_name: string | null;
}

type FanSnapshot = {
  cx: number;
  cy: number;
  w: number;
  h: number;
  rotation: number;
};

const MAX_FAN = 5;

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const params = useParams<{ id?: string[] }>();
  const targetUsername = params.id?.[0] ?? null;
  const router = useRouter();

  const [myUsername, setMyUsername] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fanCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const expandedRef = useRef<HTMLDivElement>(null);
  const fanSnapshots = useRef<FanSnapshot[]>([]);

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
        if (p.error && targetUsername) {
          router.replace("/");
          return;
        }
        if (!p.error) setProfile(p);
        if (Array.isArray(recipesData)) setRecipes(recipesData as Recipe[]);
        if (followData) {
          const f = followData as {
            isFollowing?: boolean;
            followsMe?: boolean;
          };
          setIsFollowing(!!f.isFollowing);
          setFollowsMe(!!f.followsMe);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [displayUsername, targetUsername]);

  // FLIP animation: runs after the grid renders when expanded becomes true
  useLayoutEffect(() => {
    if (!expanded) return;

    const snapshots = fanSnapshots.current;
    if (!snapshots.length || !expandedRef.current) return;

    // Find the first N recipe cards inside the expanded section
    const allCards = expandedRef.current.querySelectorAll(
      `.${recipeStyles.recipeCard}`,
    );
    const cards = Array.from(allCards).slice(
      0,
      snapshots.length,
    ) as HTMLElement[];

    // Apply inverse transforms so each card starts at its fan card position
    cards.forEach((el, i) => {
      if (!snapshots[i]) return;
      const rect = el.getBoundingClientRect();
      const gridCx = rect.left + rect.width / 2;
      const gridCy = rect.top + rect.height / 2;
      const dx = snapshots[i].cx - gridCx;
      const dy = snapshots[i].cy - gridCy;
      const scale = snapshots[i].w / rect.width;
      const opacity = 0;

      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${snapshots[i].rotation}deg) scale(${scale})`;
      el.style.transformOrigin = "center center";
      el.style.transition = "none";
      el.style.zIndex = "5";
      el.style.borderRadius = "6px";
    });

    void (cards[0] as HTMLElement | undefined)?.offsetWidth;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cards.forEach((el) => {
          el.style.transition =
            "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.55s ease";
          el.style.transform = "";
          el.style.borderRadius = "";
        });

        setTimeout(() => {
          cards.forEach((el) => {
            el.style.transition = "";
            el.style.transformOrigin = "";
            el.style.zIndex = "";
          });
        }, 600);
      });
    });
  }, [expanded]);

  if (!isLoaded || loading) {
    return <div className={styles.loading}>Loading…</div>;
  }

  const isOwnProfile = !targetUsername || targetUsername === myUsername;
  const displayName =
    isOwnProfile && user
      ? user.fullName || user.firstName || myUsername || ""
      : profile?.display_name || displayUsername || "";
  const avatarUrl =
    isOwnProfile && user ? user.imageUrl : (profile?.image_url ?? null);

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

  function handleExpand() {
    if (expanded || fanRecipes.length === 0) return;

    const snapshots: FanSnapshot[] = [];
    fanCardRefs.current.forEach((el, i) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const rotation = (i - fanTotal / 2 + 0.5) * 9;
      snapshots.push({
        cx: rect.left + rect.width / 2 - 4 * i,
        cy: rect.top + rect.height / 2 + 40,
        w: el.offsetWidth,
        h: el.offsetHeight,
        rotation,
      });
    });

    fanSnapshots.current = snapshots;
    setExpanded(true);
  }

  function handleCollapse(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded(false);
    fanCardRefs.current = [];
  }

  return (
    <div>
      <div className={styles.topRowContainer}>
        <div className={styles.avatarContainer}>{avatarEl}</div>
        <div className={styles.profileCard}>
          <div className={styles.cardInfo}>
            <h1 className={styles.name}>{displayName}</h1>
            <div className={styles.stats}>
              <div>
                <span className={styles.statCount}>{followerCount}</span>
                <span className={styles.statLabel}> followers</span>
              </div>
              <div>
                <span className={styles.statCount}>{followingCount}</span>
                <span className={styles.statLabel}> following</span>
              </div>
            </div>
            {!isOwnProfile && profile && (
              <div className={styles.followWrap}>
                <FollowButton
                  username={displayUsername!}
                  initialIsFollowing={isFollowing}
                />
                {followsMe && (
                  <span className={styles.followsYouBadge}>Follows you</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className={styles.bottomRow}>
          <div
            className={`${styles.recipesContainer} ${
              expanded
                ? styles.recipesContainerExpanded
                : styles.recipesContainerClickable
            }`}
            onClick={!expanded ? handleExpand : undefined}>
            <div className={styles.recipesBadge}>
              <span>
                {recipeCount} recipe{recipeCount !== 1 ? "s" : ""} saved
              </span>
              {expanded && (
                <button
                  className={styles.collapseBtn}
                  onClick={handleCollapse}
                  aria-label="Collapse recipes">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Fan view — shown when collapsed */}
            {!expanded && fanRecipes.length > 0 && (
              <div
                className={styles.recipeFan}
                style={{ "--fan-total": fanTotal } as React.CSSProperties}>
                {fanRecipes.map((recipe, i) => (
                  <div
                    key={recipe.id}
                    ref={(el) => {
                      fanCardRefs.current[i] = el;
                    }}
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
                    ref={(el) => {
                      fanCardRefs.current[fanTotal] = el;
                    }}
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

            {/* Expanded view — search, filters, full grid */}
            {expanded && (
              <div ref={expandedRef} className={styles.expandedSection}>
                <RecipeFilterPanel
                  recipes={recipes}
                  onRecipeSelect={(recipe) => window.open(recipe.url, "_blank")}
                  theme="inverted"
                  hideDeleteButton
                  controlsClassName={styles.expandedControls}
                  tagsFilterClassName={styles.expandedTagsFilter}
                />
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
          {followsMe && (
            <span className={styles.followsYouBadge}>Follows you</span>
          )}
        </div>
      )}
    </div>
  );
}
