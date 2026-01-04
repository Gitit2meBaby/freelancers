"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

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

  useEffect(() => {
    // Redirect if user tries to access someone else's profile
    if (isLoggedIn && session?.user?.slug !== params.slug) {
      router.push(`/my-account/${session.user.slug}`);
      return;
    }

    // Fetch profile data once authenticated
    if (!isLoadingAuth) {
      fetchProfileData(params.slug);
    }
  }, [isLoggedIn, session, params.slug, router, isLoadingAuth]);

  const fetchProfileData = async (slug) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch from the freelancer API endpoint
      const response = await fetch(`/api/freelancer/${slug}`);

      if (!response.ok) {
        throw new Error("Profile not found");
      }

      const result = await response.json();
      const data = result.data;

      // Transform API data to match profile display format
      const profileData = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        bio: data.bio,
        role: data.skills?.[0]?.skillName || "Film Crew Member",
        department: data.skills?.[0]?.departmentName || null,
        image_url: data.photoUrl,
        cv_url: data.cvUrl,
        skills: data.skills || [],
        links: data.links || {},
      };

      setProfileData(profileData);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push(`/edit-profile`);
  };

  const handleDownloadCV = () => {
    if (profileData?.cv_url) {
      window.open(profileData.cv_url, "_blank");
    }
  };

  // Loading state
  if (isLoadingAuth || loading) {
    return (
      <section
        className={styles.profilePage}
        data-footer="noBorder"
        data-page="plain"
      >
        <div className={styles.loading}>Loading profile...</div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section
        className={styles.profilePage}
        data-footer="noBorder"
        data-page="plain"
      >
        <div className={styles.error}>
          <h2>Profile Not Found</h2>
          <p>{error}</p>
          <button
            onClick={() => router.push("/crew-directory")}
            className={styles.editButton}
          >
            Back to Directory
          </button>
        </div>
      </section>
    );
  }

  // No profile data
  if (!profileData) {
    return (
      <section
        className={styles.profilePage}
        data-footer="noBorder"
        data-page="plain"
      >
        <div className={styles.loading}>No profile data available</div>
      </section>
    );
  }

  return (
    <section
      className={styles.profilePage}
      data-footer="noBorder"
      data-page="plain"
    >
      <h1 className={styles.pageTitle}>Crew Profile</h1>

      <div className={styles.profileContainer}>
        <div className={styles.profileImageSection}>
          {profileData.image_url ? (
            <Image
              src={profileData.image_url}
              alt={profileData.name}
              width={430}
              height={680}
              className={styles.profileImage}
              priority
            />
          ) : (
            <div className={styles.placeholderImage}>
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="70" r="40" fill="#d1d5db" />
                <ellipse cx="100" cy="160" rx="60" ry="50" fill="#d1d5db" />
              </svg>
              <p>No photo available</p>
            </div>
          )}

          <button onClick={handleEditProfile} className={styles.editButton}>
            Edit Profile
          </button>

          {profileData.cv_url && (
            <button
              onClick={handleDownloadCV}
              className={styles.downloadButton}
            >
              Download CV
            </button>
          )}
        </div>

        <div className={styles.profileInfo}>
          <h2 className={styles.name}>{profileData.name}</h2>
          <p className={styles.role}>{profileData.role}</p>
          {profileData.department && (
            <p className={styles.department}>{profileData.department}</p>
          )}

          {profileData.bio && (
            <div className={styles.bioSection}>
              <h3>About</h3>
              <p className={styles.bio}>{profileData.bio}</p>
            </div>
          )}

          {profileData.skills && profileData.skills.length > 0 && (
            <div className={styles.skillsSection}>
              <h3>Skills</h3>
              <div className={styles.skillsList}>
                {profileData.skills.map((skill, index) => (
                  <span key={index} className={styles.skillTag}>
                    {skill.skillName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {Object.values(profileData.links).some((link) => link) && (
            <div className={styles.linksSection}>
              <h3>Connect</h3>
              <div className={styles.linksList}>
                {profileData.links.website && (
                  <a
                    href={profileData.links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    Website
                  </a>
                )}
                {profileData.links.instagram && (
                  <a
                    href={profileData.links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    Instagram
                  </a>
                )}
                {profileData.links.imdb && (
                  <a
                    href={profileData.links.imdb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    IMDb
                  </a>
                )}
                {profileData.links.linkedin && (
                  <a
                    href={profileData.links.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
