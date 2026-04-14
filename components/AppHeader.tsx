"use client";

import Link from "next/link";
import { UserMenu } from "./UserMenu";
import styles from "./AppHeader.module.css";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <em>
          Recipe<b>Box</b>
        </em>
      </Link>
      <UserMenu />
    </header>
  );
}
