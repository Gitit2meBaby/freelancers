// app/my-account/[slug]/page.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/AuthContext";
import Image from "next/image";
import styles from "../../styles/profile.module.scss";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    if (isLoggedIn && user?.slug !== params.slug) {
      router.push(`/my-account/${user?.slug}`);
      return;
    }

    fetchProfileData(params.slug);
  }, [isLoggedIn, user, params.slug, router]);

  const fetchProfileData = async (slug) => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/profile/${slug}`);
      // if (!response.ok) throw new Error('Profile not found');
      // const data = await response.json();

      // Mock data for now
      const data = {
        id: user?.id || "123",
        name: user?.name || "Dan Thomas",
        slug: slug,
        role: "Stills Photographer",
        image_url: user?.image_url || null,
      };

      setProfileData(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleEditProfile = () => {
    // Redirect to edit profile with user ID as query parameter
    router.push(`/edit-profile?id=${profileData.id}`);
  };

  if (!profileData) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className={styles.profilePage}>
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
            </div>
          )}

          <button onClick={handleEditProfile} className={styles.editButton}>
            Edit Profile
          </button>
        </div>

        <div className={styles.profileInfo}>
          <h2 className={styles.name}>{profileData.name}</h2>
          <p className={styles.role}>{profileData.role}</p>
        </div>
      </div>
    </div>
  );
}
