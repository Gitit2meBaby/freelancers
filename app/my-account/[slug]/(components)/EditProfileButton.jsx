// app/my-account/[slug]/(components)/EditProfileButton.jsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

import styles from "../../../styles/profile.module.scss";

/**
 * Small client component to show Edit button only for profile owner
 * This is the ONLY part that needs client-side rendering
 */
export default function EditProfileButton({ profileSlug, className = "" }) {
  const { data: session, status } = useSession();

  // Don't show button while loading or if not authenticated
  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

  // Only show button if viewing own profile
  const isOwnProfile = session?.user?.slug === profileSlug;

  if (!isOwnProfile) {
    return null;
  }

  return (
    <Link href="/edit-profile" className={`${styles.editButton} ${className}`}>
      Edit Profile
    </Link>
  );
}
