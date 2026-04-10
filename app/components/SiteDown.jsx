"use client";

import { useState } from "react";
import styles from "../styles/siteDown.module.scss";

export default function SiteDown() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sitedown-title"
    >
      <div className={styles.modal}>
        {/* Close button */}
        <button
          className={styles.closeButton}
          onClick={() => setIsVisible(false)}
          aria-label="Close notification"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Icon */}
        <div className={styles.iconWrapper} aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Content */}
        <h2 id="sitedown-title" className={styles.title}>
          We&rsquo;re experiencing high demand
        </h2>
        <p className={styles.message}>
          We apologise for any disruption to your experience. Our team is
          actively working to resolve the issue as quickly as possible.
        </p>
        <p className={styles.subMessage}>
          Some pages or features may be temporarily unavailable. Thank you for
          your patience.
        </p>

        <div className={styles.divider} />

        {/* Acknowledge button */}
        <button
          className={styles.acknowledgeButton}
          onClick={() => setIsVisible(false)}
        >
          I understand
        </button>
      </div>
    </div>
  );
}
