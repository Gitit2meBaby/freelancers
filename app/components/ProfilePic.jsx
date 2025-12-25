// app/components/ProfilePic.jsx
"use client";
import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

import { useAuth } from "../AuthContext";

import defaultAvatar from "../../public/member/default-avatar.jpg";

import styles from "../styles/profilePic.module.scss";

const ProfilePic = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuth();
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Show profile pic on all pages except home page when logged in
  const shouldRender = pathname !== "/" && isLoggedIn;

  useEffect(() => {
    if (isLoggedIn && user?.profileImageId) {
      fetchProfileImage(user.profileImageId).then(setProfileImageUrl);
    }
  }, [isLoggedIn, user]);

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

  const fetchProfileImage = async (imageId) => {
    // TODO: Your Azure Blob fetch logic
    // const url = await getAzureBlobUrl(imageId);
    // return url;
  };

  const handleViewProfile = () => {
    setIsOpen(false);
    router.push(`/my-account/${user?.slug || ""}`);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    router.push("/");
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Early return - component doesn't render at all
  if (!shouldRender) return null;

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
            alt={user?.name || "Profile"}
            width={56}
            height={56}
            className={styles.profilePic}
          />
        ) : (
          <Image
            src={defaultAvatar}
            alt={user?.name || "Profile"}
            width={56}
            height={56}
            className={styles.profilePic}
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
