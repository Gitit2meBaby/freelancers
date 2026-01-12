// app/my-account/[slug]/page.js
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

import News from "../../components/News";

import styles from "../../styles/profile.module.scss";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isLoggedIn = status === "authenticated";
  const isLoadingAuth = status === "loading";
  const isOwnProfile = isLoggedIn && session?.user?.slug === params.slug;

  useEffect(() => {
    if (!isLoadingAuth) {
      fetchProfileData(params.slug);
    }
  }, [params.slug, isLoadingAuth]);

  const fetchProfileData = async (slug) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/freelancer/${slug}`);

      if (!response.ok) {
        throw new Error("Profile not found");
      }

      const result = await response.json();
      const data = result.data;

      const profileData = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        bio: data.bio,
        role: data.skills?.[0]?.skillName || "Film Crew Member",
        department: data.skills?.[0]?.departmentName || "",
        photoUrl: data.photoUrl,
        cvUrl: data.cvUrl,
        links: data.links || {},
        skills: data.skills || [],
      };

      setProfileData(profileData);
    } catch (error) {
      console.error("Error loading profile:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || isLoadingAuth) {
    return (
      <div
        className={styles.profilePage}
        data-footer="noBorder"
        data-page="plain"
      >
        <div className={styles.loadingSpinner}>
          <svg
            width="66"
            height="66"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={styles.spinner}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              strokeOpacity="0.3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.profilePage}>
        <h1 className={styles.pageTitle}>Crew Profile</h1>
        <p className={styles.error}>Profile not found</p>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  return (
    <section
      className={styles.profilePage}
      data-page="plain"
      data-footer="noBorder"
    >
      <h1 className={styles.pageTitle}>Crew Profile</h1>

      <div className={styles.profileContainer}>
        {/* Left: Photo */}
        <div className={styles.photoSection}>
          {profileData.photoUrl ? (
            <Image
              src={profileData.photoUrl}
              alt={profileData.name}
              width={430}
              height={680}
              className={styles.profilePhoto}
            />
          ) : (
            <div className={styles.placeholderPhoto}>
              <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="100" cy="70" r="35" fill="#ccc" />
                <ellipse cx="100" cy="160" rx="60" ry="50" fill="#ccc" />
              </svg>
            </div>
          )}

          {/* Edit Profile Button (only show on desktop) */}
          {isOwnProfile && (
            <Link
              href="/edit-profile"
              className={`${styles.editButton} ${styles.desk}`}
            >
              Edit Profile
            </Link>
          )}
        </div>

        {/* Right: Info */}
        <div className={styles.infoSection}>
          <h2 className={styles.name}>{profileData.name}</h2>
          <p className={styles.role}>{profileData.role}</p>
        </div>
      </div>

      {/* Edit Profile Button (only show on mobile) */}
      {isOwnProfile && (
        <Link
          href="/edit-profile"
          className={`${styles.editButton} ${styles.mob}`}
        >
          Edit Profile
        </Link>
      )}

      <News />
    </section>
  );
}
