"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";
import styles from "./page.module.css";

export default function OnboardingPage() {
  const router = useRouter();
  const [initialUsername] = useState("");
  const [initialDisplayName, setInitialDisplayName] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  // If user already has a username, redirect away from onboarding
  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.username) {
          setRedirecting(true);
          router.replace(`/user/${data.username}`);
        }
        if (data?.display_name) setInitialDisplayName(data.display_name);
      })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.heading}>Welcome to RecipeBox</h1>
        <p className={styles.subheading}>Set up your profile to get started.</p>

        <ProfileForm
          initialUsername={initialUsername}
          initialDisplayName={initialDisplayName}
          submitLabel="Continue"
          loading={redirecting}
          onSuccess={(data) => router.replace(`/user/${data.username}`)}
        />
      </div>
    </div>
  );
}
