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

  const [pendingStatus, setPendingStatus] = useState({
    photo: false,
    cv: false,
    bio: false,
  });

  useEffect(() => {
    if (!isLoadingAuth) {
      fetchProfileData(params.slug);

      // If viewing own profile, also fetch pending status
      if (isOwnProfile) {
        fetchPendingStatus();
      }
    }
  }, [params.slug, isLoadingAuth, isOwnProfile]);

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

  // NEW: Fetch pending verification status
  const fetchPendingStatus = async () => {
    try {
      const response = await fetch(`/api/my-pending-status`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPendingStatus(result.pending);
        }
      }
    } catch (error) {
      console.error("Error loading pending status:", error);
    }
  };

  if (loading || isLoadingAuth) {
    return (
      <div className={styles.profilePage}>
        <p>Loading profile...</p>
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
