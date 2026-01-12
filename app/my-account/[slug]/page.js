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

  console.log(profileData);

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
          <p className={styles.bio}>{profileData.bio}</p>

          {/* Links */}
          {(profileData.links.Website ||
            profileData.links.Instagram ||
            profileData.links.Imdb ||
            profileData.links.LinkedIn) && (
            <div className={styles.links}>
              {profileData.links.Website && (
                <Link
                  href={profileData.links.Website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Website
                </Link>
              )}

              {profileData.links.Instagram && (
                <Link
                  href={profileData.links.Instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="5"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="4"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="18" cy="6" r="1" fill="currentColor" />
                  </svg>
                  Instagram
                </Link>
              )}

              {profileData.links.Imdb && (
                <Link
                  href={profileData.links.Imdb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="2"
                      y="3"
                      width="20"
                      height="18"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M7 7v10M10 7v10M13 7l2 10M17 7l2 10"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  IMDb
                </Link>
              )}

              {profileData.links.LinkedIn && (
                <Link
                  href={profileData.links.LinkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <rect
                      x="2"
                      y="9"
                      width="4"
                      height="12"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="4" cy="4" r="2" fill="currentColor" />
                  </svg>
                  LinkedIn
                </Link>
              )}
            </div>
          )}

          {/* CV Download */}
          {profileData.cvUrl && (
            <div className={styles.cvSection}>
              <a
                href={profileData.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cvButton}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M7 10l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 15V3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Download CV
              </a>
            </div>
          )}
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
