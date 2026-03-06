"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styles from "../styles/adminModal.module.scss";

const ADMIN_STORAGE_KEY = "fp_admin_auth";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 10000; // 300 days

export default function AdminModal({
  onClose,
  redirectTo = "/admin/news",
  onSuccess,
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef(null);

  const AdminEmails = [
    "info@freelancers.com.au",
    "accounts@freelancers.com.au",
    "dan@officeexperts.com.au",
    "paul.misfud@officeexperts.com.au",
    "thisworldofdans@gmail.com",
  ];

  useEffect(() => {
    emailRef.current?.focus();
    checkAdminAuth();
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Both fields are required.");
      return;
    }

    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (password !== adminPassword) {
      setError("Incorrect credentials. Please try again.");
      return;
    }

    setAdminAuth(email.trim());
    if (onSuccess) {
      onSuccess();
    } else {
      onClose?.();
      router.push(redirectTo);
    }
  };

  return createPortal(
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <p className={styles.wordmark}>Freelancers Promotions</p>
        <h2 className={styles.title} id="admin-modal-title">
          Admin Access
        </h2>
        <p className={styles.subtitle}>Enter your credentials to continue.</p>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.fieldGroup}>
            <label htmlFor="admin-email" className={styles.label}>
              Email
            </label>
            <input
              ref={emailRef}
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="admin-password" className={styles.label}>
              Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.showPasswordBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className={styles.divider} />
        <p className={styles.footerNote}>
          You&apos;ll stay signed in for 300 days.
        </p>
      </div>
    </div>,
    document.body,
  );
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export function setAdminAuth(email) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      ADMIN_STORAGE_KEY,
      JSON.stringify({ email, ts: Date.now() }),
    );
  } catch {}
}

export function checkAdminAuth() {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < EXPIRY_MS;
  } catch {
    return false;
  }
}

export function clearAdminAuth() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch {}
}
