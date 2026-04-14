"use client";
import { useUser } from "@clerk/nextjs";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  console.log(user);
  return (
    <div>
      hiii {isLoaded} {user && user.fullName}
    </div>
  );
}
