// app/components/ProfilePic.jsx - UPDATED
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
  const [isOpen, setIsOpen] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const dropdownRef = useRef(null);

  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";

  // Show profile pic on all pages except home page when logged in
  const shouldRender = pathname !== "/" && isLoggedIn;

  useEffect(() => {
    if (isLoggedIn && session?.user) {
      // If session has image, use it
      if (session.user.image) {
        setProfileImageUrl(session.user.image);
      }
      // If no image in session but user is logged in, try to fetch it
      else if (!isFetchingImage) {
        fetchProfileImage();
      }
    }
  }, [isLoggedIn, session, isFetchingImage]);

  const fetchProfileImage = async () => {
    setIsFetchingImage(true);
    try {
      const response = await fetch("/api/auth/refresh-profile-image", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.imageUrl) {
          setProfileImageUrl(data.imageUrl);
        }
      }
    } catch (error) {
      console.error("Error fetching profile image:", error);
    } finally {
      setIsFetchingImage(false);
    }
  };

  useEffect(() => {
    // Close dropdown when clicking outside
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
