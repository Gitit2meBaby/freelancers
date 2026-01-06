// app/reset-password/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../styles/memberLogin.module.scss";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, validating, loading, success, error
  const [message, setMessage] = useState("");
  const [tokenValid, setTokenValid] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing reset token");
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    setStatus("validating");
    try {
      const response = await fetch("/api/auth/validate-reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.valid) {
        setTokenValid(true);
        setStatus("idle");
      } else {
        setStatus("error");
        setMessage(data.error || "This reset link is invalid or has expired");
      }
    } catch (error) {
      setStatus("error");
      setMessage("Failed to validate reset link. Please try again.");
    }
  };

  const validatePassword = () => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    // Validate password
    const validationError = validatePassword();
    if (validationError) {
      setStatus("error");
      setMessage(validationError);
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("Your password has been successfully reset");

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/member-login");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to reset password");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An unexpected error occurred. Please try again.");
    }
  };

  // Loading state while validating token
  if (status === "validating") {
    return (
      <section
        className={styles.loginPage}
        data-footer="noBorder"
        data-page="plain"
      >
        <div className={styles.loginContainer}>
          <div className={styles.loginCard}>
            <div className={styles.loadingSpinner}>
              <div className={styles.spinner}></div>
              <p>Validating reset link...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <section
        className={styles.loginPage}
        data-footer="noBorder"
        data-page="plain"
      >
        <div className={styles.loginContainer}>
          <div className={styles.loginCard}>
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✓</div>
              <h2>Password Reset Successfully</h2>
              <p>{message}</p>
              <p className={styles.helperText}>
                You will be redirected to the sign in page in a moment...
              </p>
              <Link href="/member-login" className={styles.primaryButton}>
                Sign In Now
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Invalid token state
  if (!tokenValid || (status === "error" && !password)) {
    return (
      <section
        className={styles.loginPage}
        data-footer="noBorder"
        data-page="plain"
      >
        <div className={styles.loginContainer}>
          <div className={styles.loginCard}>
            <div className={styles.errorMessage}>
              <h2>Invalid Reset Link</h2>
              <p>
                {message ||
                  "This password reset link is invalid or has expired."}
              </p>
              <div className={styles.buttonGroup}>
                <Link href="/forgot-password" className={styles.primaryButton}>
                  Request New Link
                </Link>
                <Link href="/member-login" className={styles.secondaryButton}>
                  Back to Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Reset password form
  return (
    <section
      className={styles.loginPage}
      data-footer="noBorder"
      data-page="plain"
    >
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>Create New Password</h1>
          <p className={styles.loginSubtitle}>Enter your new password below</p>

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.label}>
                New Password
              </label>
              <div className={styles.passwordField}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  placeholder="Enter new password"
                  required
                  disabled={status === "loading"}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.showPasswordButton}
                  disabled={status === "loading"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                placeholder="Confirm new password"
                required
                disabled={status === "loading"}
                autoComplete="new-password"
              />
            </div>

            <div className={styles.passwordRequirements}>
              <p>Password must contain:</p>
              <ul>
                <li className={password.length >= 8 ? styles.valid : ""}>
                  At least 8 characters
                </li>
                <li className={/[A-Z]/.test(password) ? styles.valid : ""}>
                  One uppercase letter
                </li>
                <li className={/[a-z]/.test(password) ? styles.valid : ""}>
                  One lowercase letter
                </li>
                <li className={/[0-9]/.test(password) ? styles.valid : ""}>
                  One number
                </li>
                <li
                  className={
                    password && password === confirmPassword ? styles.valid : ""
                  }
                >
                  Passwords match
                </li>
              </ul>
            </div>

            {status === "error" && (
              <div className={styles.errorMessage}>{message}</div>
            )}

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Resetting..." : "Reset Password"}
            </button>

            <div className={styles.linkGroup}>
              <Link href="/member-login" className={styles.secondaryLink}>
                ← Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
