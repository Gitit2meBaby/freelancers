"use client";

import React, { useState, useRef } from "react";

import styles from "../styles/contactUs.module.scss";

export const dynamic = "force-dynamic";
const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    cv: null,
    honeypot: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    subject: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    subject: false,
  });

  const [submitStatus, setSubmitStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });

  // Refs for inputs
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const subjectRef = useRef(null);

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const scrollToError = (fieldName) => {
    const refs = {
      name: nameRef,
      email: emailRef,
      subject: subjectRef,
    };

    const ref = refs[fieldName];
    if (ref && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      // Focus the input for better UX
      ref.current.focus();
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: "",
      email: "",
      subject: "",
    };

    let isValid = true;
    let firstErrorField = null;

    // Check honeypot
    if (formData.honeypot !== "") {
      alert("Bot submission detected, Please try again.");
      setFormData(formData.honeypot === "");
      return false;
    }

    // Validate Name
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
      isValid = false;
      if (!firstErrorField) firstErrorField = "name";
    }

    // Validate Email
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
      if (!firstErrorField) firstErrorField = "email";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
      if (!firstErrorField) firstErrorField = "email";
    }

    // Validate Subject
    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
      isValid = false;
      if (!firstErrorField) firstErrorField = "subject";
    }

    setErrors(newErrors);

    // Scroll to first error field
    if (!isValid && firstErrorField) {
      setTimeout(() => {
        scrollToError(firstErrorField);
      }, 100);
    }

    return isValid;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "cv") {
      console.log("CV file selected:", files[0]); // ADD THIS
      setFormData((prev) => ({
        ...prev,
        cv: files[0] || null,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear error when user starts typing
      if (errors[name] && touched[name]) {
        setErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    // Validate individual field on blur
    if (name === "name" && !formData.name.trim()) {
      setErrors((prev) => ({
        ...prev,
        name: "Name is required",
      }));
    }

    if (name === "email") {
      if (!formData.email.trim()) {
        setErrors((prev) => ({
          ...prev,
          email: "Email is required",
        }));
      } else if (!emailRegex.test(formData.email)) {
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }));
      }
    }

    if (name === "subject" && !formData.subject.trim()) {
      setErrors((prev) => ({
        ...prev,
        subject: "Subject is required",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      subject: true,
    });

    // Validate form
    if (!validateForm()) {
      console.log("Form has errors");
      return;
    }

    setSubmitStatus({ loading: true, success: false, error: null });

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("subject", formData.subject);
      formDataToSend.append("message", formData.message);
      if (formData.phone) formDataToSend.append("phone", formData.phone);
      if (formData.cv) formDataToSend.append("cv", formData.cv);

      const response = await fetch("/api/contact", {
        method: "POST",
        // Don't set Content-Type - browser sets it automatically with boundary
        body: formDataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Success!
      setSubmitStatus({ loading: false, success: true, error: null });

      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        cv: null,
        honeypot: "",
      });
      setTouched({
        name: false,
        email: false,
        subject: false,
      });

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSubmitStatus({ loading: false, success: false, error: null });
      }, 3000);
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitStatus({
        loading: false,
        success: false,
        error: error.message,
      });
    }
  };

  return (
    <section className={styles.form}>
      <h2>Send us a message</h2>
      <form onSubmit={handleSubmit} aria-label="Contact form" noValidate>
        {/* Honeypot Input */}
        <div className={styles.hidden}>
          <input
            type="text"
            name="honeypot"
            value={formData.honeypot}
            onChange={handleChange}
            className={styles.honeypot}
            aria-hidden="true"
            tabIndex="-1"
          />
        </div>

        {/* Name Field */}
        <div className={styles.formGroup}>
          <label htmlFor="name" className={styles.label}>
            Name
            <span className={styles.required} aria-label="required">
              *
            </span>
          </label>
          <input
            ref={nameRef}
            type="text"
            id="name"
            name="name"
            className={`${styles.input} ${
              errors.name && touched.name ? styles.inputError : ""
            }`}
            placeholder="Enter name"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            aria-required="true"
            aria-invalid={errors.name && touched.name ? "true" : "false"}
            aria-describedby={
              errors.name && touched.name ? "name-error" : undefined
            }
          />
          {errors.name && touched.name && (
            <span
              id="name-error"
              className={styles.errorMessage}
              role="alert"
              aria-live="polite"
            >
              {errors.name}
            </span>
          )}
        </div>

        {/* Email Field */}
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email
            <span className={styles.required} aria-label="required">
              *
            </span>
          </label>
          <input
            ref={emailRef}
            type="email"
            id="email"
            name="email"
            className={`${styles.input} ${
              errors.email && touched.email ? styles.inputError : ""
            }`}
            placeholder="Enter email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            aria-required="true"
            aria-invalid={errors.email && touched.email ? "true" : "false"}
            aria-describedby={
              errors.email && touched.email ? "email-error" : undefined
            }
          />
          {errors.email && touched.email && (
            <span
              id="email-error"
              className={styles.errorMessage}
              role="alert"
              aria-live="polite"
            >
              {errors.email}
            </span>
          )}
        </div>

        {/* Subject Field */}
        <div className={styles.formGroup}>
          <label htmlFor="subject" className={styles.label}>
            Subject
            <span className={styles.required} aria-label="required">
              *
            </span>
          </label>
          <input
            ref={subjectRef}
            type="text"
            id="subject"
            name="subject"
            className={`${styles.input} ${
              errors.subject && touched.subject ? styles.inputError : ""
            }`}
            placeholder="Enter Subject"
            value={formData.subject}
            onChange={handleChange}
            onBlur={handleBlur}
            required
            aria-required="true"
            aria-invalid={errors.subject && touched.subject ? "true" : "false"}
            aria-describedby={
              errors.subject && touched.subject ? "subject-error" : undefined
            }
          />
          {errors.subject && touched.subject && (
            <span
              id="subject-error"
              className={styles.errorMessage}
              role="alert"
              aria-live="polite"
            >
              {errors.subject}
            </span>
          )}
        </div>

        {/* Message Field */}
        <div className={styles.formGroup}>
          <label htmlFor="message" className={styles.label}>
            Message
          </label>
          <textarea
            id="message"
            name="message"
            className={styles.textarea}
            placeholder="Enter your message"
            rows="8"
            value={formData.message}
            onChange={handleChange}
            aria-describedby="message-help"
          />
        </div>

        {/* CV Upload Field */}
        <div className={styles.formGroup}>
          <label htmlFor="cv" className={styles.label}>
            CV
          </label>
          <div className={styles.fileUpload}>
            <label htmlFor="cv" className={styles.fileLabel}>
              {formData.cv ? formData.cv.name : "Upload CV"}
            </label>
            <span className={styles.fileHint}>
              PDF, Maximum file size is 1MB
            </span>
            <input
              type="file"
              id="cv"
              name="cv"
              className={styles.fileInput}
              accept=".pdf"
              onChange={handleChange}
              aria-describedby="cv-help"
            />
          </div>
        </div>

        {/* Success Message */}
        {submitStatus.success && (
          <div className={styles.successMessage} role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" />
              <path
                d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span>Message sent successfully! We'll get back to you soon.</span>
          </div>
        )}

        {/* Error Message */}
        {submitStatus.error && (
          <div className={styles.errorMessageBox} role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 8v4M12 16h.01"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span>{submitStatus.error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitStatus.loading}
            aria-busy={submitStatus.loading}
            aria-label="Send message"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {submitStatus.loading ? "Sending..." : "Send message"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ContactForm;
