// app/components/VerificationModal.jsx
"use client";

import { useEffect } from "react";
import styles from "../styles/verificationModal.module.scss";

/**
 * Modal that appears after user updates their profile
 * Informs them their changes will be verified by the Freelancers team
 */
export default function VerificationModal({ isOpen, onClose, changes }) {
  // Close modal with Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent scroll
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine what changed
  const changedItems = [];
  if (changes?.name) changedItems.push("display name");
  if (changes?.bio) changedItems.push("bio");
  if (changes?.photo) changedItems.push("photo");
  if (changes?.cv) changedItems.push("CV");
  if (changes?.links) changedItems.push("links");

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Success Icon */}
        <div className={styles.iconContainer}>
          <svg
            className={styles.successIcon}
            viewBox="0 0 52 52"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className={styles.successCircle}
              cx="26"
              cy="26"
              r="25"
              fill="none"
            />
            <path
              className={styles.successCheck}
              fill="none"
              d="M14.1 27.2l7.1 7.2 16.7-16.8"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className={styles.title}>Changes Submitted!</h2>

        {/* Message */}
        <div className={styles.message}>
          <p>Your changes have been saved.</p>

          <div className={styles.infoBox}>
            <strong>What happens next?</strong>
            <p>
              The Freelancers Promotions team will review your changes as soon
              as possible. You'll see them on your public profile once they're
              approved.
            </p>
          </div>

          <p className={styles.note}>*This usually takes 1-2 business days.</p>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className={styles.closeButton}>
          Got it
        </button>
      </div>
    </div>
  );
}
