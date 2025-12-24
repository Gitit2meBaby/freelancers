"use client";

import { useState, useEffect } from "react";
import styles from "../styles/cookieConsent.module.scss";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookiesAccepted = localStorage.getItem("cookies");

    if (cookiesAccepted !== "true") {
      // Small delay to trigger the slide-up animation
      setTimeout(() => {
        setIsVisible(true);
      }, 100);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookies", "true");
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.cookieWrapper}>
      <div className={styles.cookieConsent}>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close cookie consent"
        >
          ×
        </button>
        <p className={styles.message}>
          Freelancers Promotion uses functional cookies and cookies for the
          management of web statistics, advertisements, and social media. By
          using our website you agree to these cookies and similar techniques.
        </p>
        <div className={styles.btnContainer}>
          <button
            className={styles.acceptButton}
            onClick={handleAccept}
            aria-label="Accept cookies"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
