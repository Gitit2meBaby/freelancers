"use client";
import React, { useEffect } from "react";
import styles from "../../../../styles/freelancerModal.module.scss";

export default function FreelancerModal({ freelancer, onClose }) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
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

        <div className={styles.modalContent}>
          {/* Left Column - Photo */}
          <div className={styles.photoColumn}>
            {freelancer.photoUrl ? (
              <img
                src={freelancer.photoUrl}
                alt={freelancer.name}
                className={styles.photo}
              />
            ) : (
              <div className={styles.photoPlaceholder}>
                <span>{freelancer.name.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className={styles.detailsColumn}>
            {/* Name */}
            <h2 className={styles.name}>{freelancer.name}</h2>

            {/* Bio */}
            {freelancer.bio && (
              <div className={styles.bio}>
                <p>{freelancer.bio}</p>
              </div>
            )}

            {/* Links */}
            {(freelancer.links.website ||
              freelancer.links.instagram ||
              freelancer.links.imdb ||
              freelancer.links.linkedin) && (
              <div className={styles.links}>
                {freelancer.links.website && (
                  <a
                    href={freelancer.links.website}
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
                  </a>
                )}

                {freelancer.links.instagram && (
                  <a
                    href={freelancer.links.instagram}
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
                  </a>
                )}

                {freelancer.links.imdb && (
                  <a
                    href={freelancer.links.imdb}
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
                  </a>
                )}

                {freelancer.links.linkedin && (
                  <a
                    href={freelancer.links.linkedin}
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
                  </a>
                )}
              </div>
            )}

            {/* CV Download */}
            {freelancer.cvUrl && (
              <div className={styles.cvSection}>
                <a
                  href={freelancer.cvUrl}
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
      </div>
    </div>
  );
}
