// app/forgot-password/(components)/ForgotPasswordClient.jsx
"use client";
import { useState } from "react";
import Link from "next/link";

import styles from "../../styles/forgotPassword.module.scss";

export const dynamic = "force-dynamic";
const ForgotPasswordClient = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    // Basic validation
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address");
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage("You will receive password reset instructions.");
        setEmail(""); // Clear the form
      } else {
        setStatus("error");
        setMessage(data.error || "An error occurred. Please try again.");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setStatus("error");
      setMessage("An unexpected error occurred. Please try again later.");
    }
  };

  return (
    <section
      className={styles.loginPage}
      data-footer="noBorder"
      data-page="plain"
    >
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <h1 className={styles.loginTitle}>
            {status !== "success"
              ? "Reset Your Password"
              : "Password Reset Link Sent..."}
          </h1>

          {status !== "success" ? (
            <p className={styles.loginSubtitle}>
              Enter your email address and we'll send you instructions to reset
              your password.
            </p>
          ) : null}

          {status === "success" ? (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✓</div>
              <h2>Check Your Email</h2>
              <p>{message}</p>
              <p className={styles.helperText}>
                If you don't see the email, check your spam folder.
              </p>
              <div className={styles.buttonGroup}>
                <Link href="/member-login" className={styles.primaryButton}>
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.loginForm}>
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  placeholder="your@email.com"
                  required
                  disabled={status === "loading"}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              {status === "error" && (
                <div className={styles.errorMessage}>{message}</div>
              )}

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={status === "loading"}
              >
                {status === "loading" ? "Sending..." : "Send Reset Link"}
              </button>

              <div className={styles.linkGroup}>
                <Link href="/member-login" className={styles.secondaryLink}>
                  ← Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>

        <div className={styles.helpSection}>
          <h3>Need Help?</h3>
          <p>
            If you're having trouble resetting your password, contact us at{" "}
            <a href="mailto:info@freelancers.com.au">info@freelancers.com.au</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default ForgotPasswordClient;
