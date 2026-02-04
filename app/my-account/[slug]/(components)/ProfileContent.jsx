"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import EditProfileButton from "./EditProfileButton";
import styles from "../../../styles/profile.module.scss";
import Spinner from "@/app/components/Spinner";

/**
 * ProfileContent Component - FIXED URL CACHE-BUSTING
 */
export default function ProfileContent({ profileData }) {
  const searchParams = useSearchParams();
  const [photoError, setPhotoError] = useState(false);
  const [isCheckingPhoto, setIsCheckingPhoto] = useState(
    !!profileData.photoUrl,
  );
  const [photoUrl, setPhotoUrl] = useState(profileData.photoUrl);
  const [imageKey, setImageKey] = useState(0);

  const [hasCv, setHasCv] = useState(false);
  const [isCheckingCv, setIsCheckingCv] = useState(!!profileData.cvUrl);

  const [hasEquipment, setHasEquipment] = useState(false);
  const [isCheckingEquipment, setIsCheckingEquipment] = useState(
    !!profileData.equipmentListUrl,
  );

  const skills = profileData.skills || [];
  const hasSkills = skills.length > 0;

  // ✅ Helper to properly append cache-busting param
  const addCacheBuster = (url) => {
    if (!url) return null;

    const timestamp = Date.now();
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${timestamp}`;
  };

  // Check for update timestamp in URL
  useEffect(() => {
    const updated = searchParams.get("updated");
    if (updated && profileData.photoUrl) {
      // ✅ FIX: Properly add cache-busting timestamp
      const urlWithCacheBuster = addCacheBuster(profileData.photoUrl);
      setPhotoUrl(urlWithCacheBuster);
      setImageKey((prev) => prev + 1);
      console.log("✅ ProfileContent: Applied cache-busting timestamp");
    }
  }, [searchParams, profileData.photoUrl]);

  // Validate photo exists
  useEffect(() => {
    if (!photoUrl) {
      setIsCheckingPhoto(false);
      return;
    }

    const img = new window.Image();

    img.onload = () => {
      setIsCheckingPhoto(false);
    };

    img.onerror = () => {
      setPhotoError(true);
      setIsCheckingPhoto(false);
    };

    img.src = photoUrl;
  }, [photoUrl]);

  // Validate CV exists
  useEffect(() => {
    if (!profileData.cvUrl) {
      setIsCheckingCv(false);
      return;
    }

    const checkCv = async () => {
      try {
        const response = await fetch(profileData.cvUrl, {
          method: "HEAD",
        });

        if (response.ok) {
          setHasCv(true);
        } else {
          setHasCv(false);
        }
      } catch (error) {
        setHasCv(false);
      } finally {
        setIsCheckingCv(false);
      }
    };

    checkCv();
  }, [profileData.cvUrl]);

  // Validate equipment list exists
  useEffect(() => {
    if (!profileData.equipmentListUrl) {
      setIsCheckingEquipment(false);
      return;
    }

    const checkEquipment = async () => {
      try {
        const response = await fetch(profileData.equipmentListUrl, {
          method: "HEAD",
        });

        if (response.ok) {
          setHasEquipment(true);
        } else {
          setHasEquipment(false);
        }
      } catch (error) {
        setHasEquipment(false);
      } finally {
        setIsCheckingEquipment(false);
      }
    };

    checkEquipment();
  }, [profileData.equipmentListUrl]);

  return (
    <>
      <h1 className={styles.pageTitle}>Crew Profile</h1>

      <div className={styles.profileContainer}>
        {/* Left: Photo */}
        <div className={styles.photoSection}>
          {photoUrl && !photoError && !isCheckingPhoto ? (
            <Image
              src={photoUrl}
              alt={profileData.name}
              width={430}
              height={680}
              className={styles.profilePhoto}
              priority={false}
              key={`photo-${imageKey}`}
              unoptimized
              onError={() => {
                setPhotoError(true);
              }}
            />
          ) : isCheckingPhoto ? (
            <div className={styles.placeholderPhoto}>
              <Spinner />
            </div>
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

          <EditProfileButton
            profileSlug={profileData.slug}
            className={styles.desk}
          />
        </div>

        {/* Right: Info */}
        <div className={styles.infoSection}>
          <h2 className={styles.name}>{profileData.name}</h2>
          <p className={styles.role}>
            {hasSkills
              ? skills.map((skill, index) => (
                  <span key={skill.skillId}>
                    {skill.skillName}
                    {index < skills.length - 1 && <br />}
                  </span>
                ))
              : "Film Crew Member"}
          </p>
          {profileData.bio && <p className={styles.bio}>{profileData.bio}</p>}

          {/* Links */}
          <div className={styles.links}>
            {profileData.links?.Website ? (
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
            ) : (
              <span
                className={`${styles.link} ${styles.disabled}`}
                title="Website not added yet"
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
              </span>
            )}

            {profileData.links?.Instagram ? (
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
            ) : (
              <span
                className={`${styles.link} ${styles.disabled}`}
                title="Instagram not added yet"
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
              </span>
            )}

            {profileData.links?.Imdb ? (
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
            ) : (
              <span
                className={`${styles.link} ${styles.disabled}`}
                title="IMDb not added yet"
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
              </span>
            )}

            {profileData.links?.LinkedIn ? (
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
            ) : (
              <span
                className={`${styles.link} ${styles.disabled}`}
                title="LinkedIn not added yet"
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
              </span>
            )}
          </div>

          {/* CV & Equipment Download Section */}
          <div className={styles.cvSection}>
            {isCheckingCv ? (
              <button className={styles.cvButton} disabled>
                <div
                  style={{
                    display: "inline-block",
                    border: "2px solid #f3f3f3",
                    borderTop: "2px solid currentColor",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Checking CV...
              </button>
            ) : !isCheckingCv && hasCv && profileData.cvUrl ? (
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
            ) : (
              <button
                className={`${styles.cvButton} ${styles.disabled}`}
                disabled
                title="CV not uploaded yet"
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
                <span className={styles.disabledLabel}>(Not Available)</span>
              </button>
            )}

            {isCheckingEquipment ? (
              <button className={styles.cvButton} disabled>
                <div
                  style={{
                    display: "inline-block",
                    border: "2px solid #f3f3f3",
                    borderTop: "2px solid currentColor",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Checking Equipment...
              </button>
            ) : !isCheckingEquipment &&
              hasEquipment &&
              profileData.equipmentListUrl ? (
              <a
                href={profileData.equipmentListUrl}
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
                Equipment List
              </a>
            ) : (
              <button
                className={`${styles.cvButton} ${styles.disabled}`}
                disabled
                title="Equipment list not uploaded yet"
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
                Equipment List
                <span className={styles.disabledLabel}>(Not Available)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <EditProfileButton
        profileSlug={profileData.slug}
        className={styles.mob}
      />

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
