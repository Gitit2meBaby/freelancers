"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

import styles from "../../../../styles/freelancerModal.module.scss";

export default function FreelancerModal({ freelancer, onClose }) {
  // Start assuming NO photo or equipment
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasEquipment, setHasEquipment] = useState(false);
  const [isCheckingPhoto, setIsCheckingPhoto] = useState(!!freelancer.photoUrl);
  const [isCheckingEquipment, setIsCheckingEquipment] = useState(
    !!freelancer.equipmentListUrl,
  );

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  // Check if photo exists when modal opens
  useEffect(() => {
    if (!freelancer.photoUrl) {
      setIsCheckingPhoto(false);
      return;
    }

    const img = new window.Image();

    img.onload = () => {
      console.log("✅ Photo loaded successfully");
      setHasPhoto(true);
      setIsCheckingPhoto(false);
    };

    img.onerror = () => {
      console.log("❌ Photo failed to load");
      setHasPhoto(false);
      setIsCheckingPhoto(false);
    };

    img.src = freelancer.photoUrl;
  }, [freelancer.photoUrl]);

  // Check if equipment list exists when modal opens
  useEffect(() => {
    if (!freelancer.equipmentListUrl) {
      setIsCheckingEquipment(false);
      return;
    }

    // Use fetch with HEAD request to check if file exists
    const checkEquipment = async () => {
      try {
        const response = await fetch(freelancer.equipmentListUrl, {
          method: "HEAD",
        });

        if (response.ok) {
          console.log("✅ Equipment list exists");
          setHasEquipment(true);
        } else {
          console.log("❌ Equipment list returned", response.status);
          setHasEquipment(false);
        }
      } catch (error) {
        console.log("❌ Equipment list failed to load:", error);
        setHasEquipment(false);
      } finally {
        setIsCheckingEquipment(false);
      }
    };

    checkEquipment();
  }, [freelancer.equipmentListUrl]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // ✅ ADDED: Download handler for PDFs
  const handleDownload = async (url, defaultFilename) => {
    try {
      console.log(`📥 Downloading: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();

      // Try to get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = defaultFilename;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      console.log(`💾 Saving as: ${filename}`);

      // Create download link and trigger it
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(downloadUrl);

      console.log(`✅ Download complete: ${filename}`);
    } catch (error) {
      console.error("❌ Download error:", error);
      alert("Failed to download file. Please try again.");
    }
  };

  // Determine if we should show CV section at all
  const showCvSection =
    freelancer.cvUrl || (!isCheckingEquipment && hasEquipment);

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div
        className={styles.modal}
        style={{
          maxWidth: hasPhoto ? "900px" : "450px",
          transition: "max-width 0.6s ease-in-out",
        }}
      >
        {/* Close Button */}
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div
          className={
            hasPhoto ? styles.modalContent : styles.modalContentNoPhoto
          }
          style={{
            transition: "all 0.6s ease-in-out",
          }}
        >
          {/* Left Column - Photo */}
          <div
            className={styles.photoColumn}
            style={{
              transition:
                "opacity 0.6s ease-in-out, transform 0.6s ease-in-out",
              opacity: hasPhoto ? 1 : 0,
              transform: hasPhoto ? "translateX(0)" : "translateX(-20px)",
            }}
          >
            {isCheckingPhoto ? (
              // Loading state in photo column
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "300px",
                }}
              >
                <div
                  style={{
                    border: "4px solid #f3f3f3",
                    borderTop: "4px solid #676900",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    animation: "spin 1s linear infinite",
                  }}
                />
              </div>
            ) : hasPhoto && freelancer.photoUrl ? (
              <img
                src={freelancer.photoUrl}
                alt={freelancer.name}
                className={styles.photo}
                style={{
                  transition: "opacity 0.6s ease-in-out",
                }}
              />
            ) : null}
          </div>

          {/* Right Column - Details */}
          <div
            className={styles.detailsColumn}
            style={{ gap: freelancer.bio ? "1.5rem" : "0" }}
          >
            {/* Name */}
            <h2 className={styles.name}>{freelancer.name}</h2>

            {/* Bio */}
            {freelancer.bio ? (
              <div className={styles.bio}>
                <p>{freelancer.bio}</p>
              </div>
            ) : (
              <div className={styles.bio}>
                <span></span>
              </div>
            )}

            {/* Skills */}
            {freelancer.skills && freelancer.skills.length > 0 && (
              <div className={styles.skills}>
                <h3>Skills</h3>
                <div className={styles.skillsList}>
                  {freelancer.skills.map((skill) => (
                    <span key={skill.skillId} className={styles.skillTag}>
                      {skill.skillName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(freelancer.links?.Website ||
              freelancer.links?.Instagram ||
              freelancer.links?.Imdb ||
              freelancer.links?.LinkedIn) && (
              <div className={styles.links}>
                {freelancer.links.Website && (
                  <Link
                    href={freelancer.links.Website}
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

                {freelancer.links.Instagram && (
                  <Link
                    href={freelancer.links.Instagram}
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

                {freelancer.links.Imdb && (
                  <Link
                    href={freelancer.links.Imdb}
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

                {freelancer.links.LinkedIn && (
                  <Link
                    href={freelancer.links.LinkedIn}
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

            {/* CV & Equipment Download Section */}
            {showCvSection && (
              <div
                className={styles.cvSection}
                style={{
                  borderTop: "2px solid #e5f4f8",
                }}
              >
                {/* CV Download - ✅ CHANGED: a tag to button with onClick */}
                {freelancer.cvUrl && (
                  <button
                    onClick={() =>
                      handleDownload(
                        freelancer.cvUrl,
                        `${freelancer.name}-CV.pdf`,
                      )
                    }
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
                  </button>
                )}

                {/* Equipment List Download - ✅ CHANGED: a tag to button with onClick */}
                {!isCheckingEquipment &&
                  hasEquipment &&
                  freelancer.equipmentListUrl && (
                    <button
                      onClick={() =>
                        handleDownload(
                          freelancer.equipmentListUrl,
                          `${freelancer.name}-Equipment-List.pdf`,
                        )
                      }
                      className={styles.cvButton}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="7"
                          height="7"
                          rx="1"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <rect
                          x="14"
                          y="3"
                          width="7"
                          height="7"
                          rx="1"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <rect
                          x="3"
                          y="14"
                          width="7"
                          height="7"
                          rx="1"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <rect
                          x="14"
                          y="14"
                          width="7"
                          height="7"
                          rx="1"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      View Equipment List
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add keyframe animation */}
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
    </div>
  );
}
