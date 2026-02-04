// app/components/ProfilePic.jsx - FINAL FIX WITH PROPER URL HANDLING
"use client";
import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

import defaultAvatar from "../../public/member/default-avatar.jpg";

import styles from "../styles/profilePic.module.scss";

const ProfilePic = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [imageKey, setImageKey] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const dropdownRef = useRef(null);
  const hasInitiallyFetched = useRef(false);

  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";

  // Show profile pic on all pages except home page when logged in
  const shouldRender = pathname !== "/" && isLoggedIn;

  // ✅ FIX: Helper to properly append cache-busting param
  const addCacheBuster = (url) => {
    if (!url) return null;

    const timestamp = Date.now();
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${timestamp}`;
  };

  const fetchProfileImage = async () => {
    if (isFetchingImage) {
      console.log("⏭️ Skipping fetch - already in progress");
      return;
    }

    setIsFetchingImage(true);
    try {
      const timestamp = Date.now();
      const response = await fetch(
        `/api/auth/refresh-profile-image?t=${timestamp}`,
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );

      if (!response.ok) {
        console.error("❌ Failed to fetch profile image");
        return;
      }

      const data = await response.json();
      if (data.success) {
        // ✅ FIX: Use helper to properly add cache-buster
        const newImageUrl = addCacheBuster(data.imageUrl);

        setProfileImageUrl(newImageUrl);
        setImageKey((prev) => prev + 1);
        console.log(
          "✅ ProfilePic: Updated to new image:",
          newImageUrl ? "yes" : "no",
        );
      }
    } catch (err) {
      console.error("❌ ProfilePic fetch failed:", err);
    } finally {
      setIsFetchingImage(false);
    }
  };

  // Initial load - only runs once when user logs in
  useEffect(() => {
    if (!isLoggedIn || !session?.user?.id) {
      hasInitiallyFetched.current = false;
      return;
    }

    if (!hasInitiallyFetched.current) {
      console.log("🔄 ProfilePic: Initial fetch");
      hasInitiallyFetched.current = true;
      fetchProfileImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, session?.user?.id]);

  // Listen for profile update events
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log(
        "📸 ProfilePic: Received profile update event, refreshing...",
      );

      setTimeout(() => {
        fetchProfileImage();
      }, 1000);
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleViewProfile = () => {
    setIsOpen(false);
    router.push(`/my-account/${session?.user?.slug || ""}`);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    hasInitiallyFetched.current = false;
    await signOut({ callbackUrl: "/" });
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Don't render while checking auth status
  if (isLoading || !shouldRender) return null;

  return (
    <div className={styles.profileDropdown} ref={dropdownRef}>
      <button
        className={styles.dropdownButton}
        onClick={toggleDropdown}
        aria-label="Profile menu"
        aria-expanded={isOpen}
      >
        {profileImageUrl ? (
          <Image
            src={profileImageUrl}
            alt={session?.user?.name || "Profile"}
            width={56}
            height={56}
            className={styles.profilePic}
            priority
            key={`profile-${imageKey}`}
            unoptimized
          />
        ) : (
          <Image
            src={defaultAvatar}
            alt={session?.user?.name || "Profile"}
            width={56}
            height={56}
            className={styles.profilePic}
            priority
          />
        )}
      </button>

      <div
        className={`${styles.dropdownMenu} ${
          !isOpen ? styles.dropdownMenuHidden : ""
        }`}
      >
        <button className={styles.dropdownItem} onClick={handleViewProfile}>
          View Profile
        </button>
        <button className={styles.dropdownItem} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfilePic;
