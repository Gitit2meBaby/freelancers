"use client";
import React, { useState } from "react";

import styles from "../styles/memberLogin.module.scss";

const Page = () => {
  const [formData, setFormData] = useState({
    username: "",
  });

  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError(true);
      return false;
    } else {
      setError(false);
      return true;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return; // Exit if validation fails
    }

    setIsSubmitting(true);

    // Here you'll add your API call to send reset link
    // For now, just simulating with alert
    alert(`A Password reset Link has been sent to ${formData.username}`);

    setIsSubmitting(false);
  };

  return (
    <section
      className={styles.memberLogin}
      data-page="plain"
      data-footer="noBorder"
      data-image="password"
    >
      <div className={styles.imageContainer}></div>

      <div className={styles.formContainer}>
        <div className={styles.content}>
          <h1>Forgot Password</h1>
          <p>
            Please enter your email address, we will send you confirmation link.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username/Email
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              placeholder="info@freelancers.com.au"
              value={formData.username}
              onChange={handleChange}
              required
              aria-required="true"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? "username-error" : undefined}
            />
            {error && (
              <p
                id="username-error"
                className={styles.errorMessage}
                role="alert"
              >
                Please enter a valid username or email address
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.submitButton}
              aria-label="Submit lost password form"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Page;
