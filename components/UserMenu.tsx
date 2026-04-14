"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut, ChevronDown, Home } from "lucide-react";
import Link from "next/link";
import styles from "./UserMenu.module.css";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const displayName = user.firstName || user.fullName || "Account";

  return (
    <div className={styles.container} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true">
        <img src={user.imageUrl} alt={displayName} className={styles.avatar} />
        Hi,&nbsp;<span className={styles.name}>{displayName}</span>!
        <ChevronDown
          size={13}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
        />
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <Link
            href={`/`}
            className={`${styles.item} ${pathname === "/" ? styles.itemActive : ""}`}
            onClick={() => setOpen(false)}>
            <Home size={15} />
            Home
          </Link>
          <Link
            href={`/user/${user.id}`}
            className={`${styles.item} ${pathname === `/user/${user.id}` ? styles.itemActive : ""}`}
            onClick={() => setOpen(false)}>
            <User size={15} />
            Profile
          </Link>
          <Link
            href="/settings"
            className={`${styles.item} ${pathname === "/settings" ? styles.itemActive : ""}`}
            onClick={() => setOpen(false)}>
            <Settings size={15} />
            Settings
          </Link>
          <div className={styles.divider} />
          <button
            className={`${styles.item} ${styles.signOut}`}
            onClick={() => signOut(() => router.push("/"))}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
