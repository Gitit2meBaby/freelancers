"use client";
import React, { useState } from "react";

import styles from "../../styles/newJob.module.scss";

const NewJobForm = () => {
  const [formData, setFormData] = useState({
    jobTitle: "",
    status: "",
    dateOfAward: "",
    jobType: "",
    productionCompany: "",
    productionManager: "",
    contactName: "",
    contactNumber: "",
    contactEmail: "",
    directorName: "",
    producerName: "",
    dopName: "",
    jobBreakdown: "",
    location: "",
    notes: "",
    crewCheck: "",
  });

  const [showTooltip, setShowTooltip] = useState(null);
  const [submitStatus, setSubmitStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (submitStatus.error) {
      setSubmitStatus({ loading: false, success: false, error: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitStatus({ loading: true, success: false, error: null });

    try {
      const response = await fetch("/api/new-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit job");
      }

      // Success!
      setSubmitStatus({ loading: false, success: true, error: null });

      // Reset form
      setFormData({
        jobTitle: "",
        status: "",
        dateOfAward: "",
        jobType: "",
        productionCompany: "",
        productionManager: "",
        contactName: "",
        contactNumber: "",
        contactEmail: "",
        directorName: "",
        producerName: "",
        dopName: "",
        jobBreakdown: "",
        location: "",
        notes: "",
        crewCheck: "",
      });

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus({ loading: false, success: false, error: null });
      }, 5000);
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitStatus({
        loading: false,
        success: false,
        error: error.message,
      });
    }
  };

  const toggleTooltip = (field) => {
    setShowTooltip(showTooltip === field ? null : field);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Job Title */}
      <div className={styles.formGroup}>
        <label htmlFor="jobTitle">
          Job Title <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="jobTitle"
          name="jobTitle"
          value={formData.jobTitle}
          onChange={handleChange}
          required
          aria-required="true"
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Job Status */}
      <div className={styles.formGroup}>
        <label className={styles.radioGroupLabel}>
          What is the status of this job?{" "}
          <span className={styles.required}>*</span>
        </label>
        <div
          className={styles.radioGroup}
          role="radiogroup"
          aria-required="true"
        >
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="status"
              value="Awarded"
              checked={formData.status === "Awarded"}
              onChange={handleChange}
              required
              aria-required="true"
              disabled={submitStatus.loading}
            />
            <span>Awarded</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="status"
              value="Quote Hold"
              checked={formData.status === "Quote Hold"}
              onChange={handleChange}
              required
              aria-required="true"
              disabled={submitStatus.loading}
            />
            <span>Quote Hold</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="status"
              value="In Development"
              checked={formData.status === "In Development"}
              onChange={handleChange}
              required
              aria-required="true"
              disabled={submitStatus.loading}
            />
            <span>In Development</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="status"
              value="Greenlit"
              checked={formData.status === "Greenlit"}
              onChange={handleChange}
              required
              aria-required="true"
              disabled={submitStatus.loading}
            />
            <span>Greenlit</span>
          </label>
        </div>
      </div>

      {/* Date of Award */}
      <div className={styles.formGroup}>
        <label htmlFor="dateOfAward">Date of award</label>
        <input
          type="date"
          id="dateOfAward"
          name="dateOfAward"
          value={formData.dateOfAward}
          onChange={handleChange}
          placeholder="If quote hold, provide award date"
          className={styles.input}
          aria-describedby="dateOfAwardHelp"
          disabled={submitStatus.loading}
        />
        <span id="dateOfAwardHelp" className={styles.helpText}>
          If job is a quote hold, please provide the date the job is due to
          award
        </span>
      </div>

      {/* Job Type */}
      <div className={styles.formGroup}>
        <label className={styles.radioGroupLabel}>
          What type of job is this? <span className={styles.required}>*</span>
        </label>
        <div
          className={styles.radioGroup}
          role="radiogroup"
          aria-required="true"
        >
          {[
            "Documentary",
            "Feature Film",
            "TV Series",
            "Music Video",
            "Online Content",
            "Promotional",
            "Stills",
            "TV Commercial",
            "Stills and Motion",
          ].map((type) => (
            <label key={type} className={styles.radioLabel}>
              <input
                type="radio"
                name="jobType"
                value={type}
                checked={formData.jobType === type}
                onChange={handleChange}
                required
                aria-required="true"
                disabled={submitStatus.loading}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Production Company */}
      <div className={styles.formGroup}>
        <label htmlFor="productionCompany">
          Production Company <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="productionCompany"
          name="productionCompany"
          value={formData.productionCompany}
          onChange={handleChange}
          required
          aria-required="true"
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Production Manager */}
      <div className={styles.formGroup}>
        <label htmlFor="productionManager">Production Manager</label>
        <input
          type="text"
          id="productionManager"
          name="productionManager"
          value={formData.productionManager}
          onChange={handleChange}
          placeholder="if known..."
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Contact Name */}
      <div className={styles.formGroup}>
        <label htmlFor="contactName">
          Production Company Contact Name{" "}
          <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="contactName"
          name="contactName"
          value={formData.contactName}
          onChange={handleChange}
          required
          aria-required="true"
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Contact Number */}
      <div className={styles.formGroup}>
        <label htmlFor="contactNumber">Production Company Contact Number</label>
        <input
          type="tel"
          id="contactNumber"
          name="contactNumber"
          value={formData.contactNumber}
          onChange={handleChange}
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Contact Email */}
      <div className={styles.formGroup}>
        <label htmlFor="contactEmail">
          Production Company Contact Email{" "}
          <span className={styles.required}>*</span>
        </label>
        <input
          type="email"
          id="contactEmail"
          name="contactEmail"
          value={formData.contactEmail}
          onChange={handleChange}
          required
          aria-required="true"
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Director Name */}
      <div className={styles.formGroup}>
        <label htmlFor="directorName">Directors Full Name</label>
        <input
          type="text"
          id="directorName"
          name="directorName"
          value={formData.directorName}
          onChange={handleChange}
          placeholder="Leave blank if not finalised"
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Producer Name */}
      <div className={styles.formGroup}>
        <label htmlFor="producerName">Producers Full Name</label>
        <input
          type="text"
          id="producerName"
          name="producerName"
          value={formData.producerName}
          onChange={handleChange}
          placeholder="Leave blank if not finalised"
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* DOP Name */}
      <div className={styles.formGroup}>
        <label htmlFor="dopName">DOPs Full Name</label>
        <input
          type="text"
          id="dopName"
          name="dopName"
          value={formData.dopName}
          onChange={handleChange}
          placeholder="Leave blank if not finalised"
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Job Breakdown */}
      <div className={styles.formGroup}>
        <label htmlFor="jobBreakdown">
          Job Breakdown (Dates)
          <button
            type="button"
            className={styles.tooltipButton}
            onClick={() => toggleTooltip("jobBreakdown")}
            onMouseEnter={() => setShowTooltip("jobBreakdown")}
            onMouseLeave={() => setShowTooltip(null)}
            aria-label="More information about job breakdown"
            aria-describedby="jobBreakdownTooltip"
            disabled={submitStatus.loading}
          >
            ?
          </button>
        </label>
        {showTooltip === "jobBreakdown" && (
          <div
            id="jobBreakdownTooltip"
            className={styles.tooltip}
            role="tooltip"
          >
            Please add any dates you have for the recce, shoot, prep, travel and
            also indicate if there are any night shoots
          </div>
        )}
        <textarea
          id="jobBreakdown"
          name="jobBreakdown"
          value={formData.jobBreakdown}
          onChange={handleChange}
          placeholder="Add recce, shoot, prep, travel dates"
          rows="4"
          className={styles.textarea}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Location */}
      <div className={styles.formGroup}>
        <label htmlFor="location">Location</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Melbourne Metro, Rural, Interstate/OS?"
          className={styles.input}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Notes */}
      <div className={styles.formGroup}>
        <label htmlFor="notes">
          Notes
          <button
            type="button"
            className={styles.tooltipButton}
            onClick={() => toggleTooltip("notes")}
            onMouseEnter={() => setShowTooltip("notes")}
            onMouseLeave={() => setShowTooltip(null)}
            aria-label="More information about notes"
            aria-describedby="notesTooltip"
            disabled={submitStatus.loading}
          >
            ?
          </button>
        </label>
        {showTooltip === "notes" && (
          <div id="notesTooltip" className={styles.tooltip} role="tooltip">
            Please provide other important information about job requirements
            here, including whether there are any deals or whether you are
            holding any other crew in the same department, particularly if it is
            with another agent
          </div>
        )}
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Important job requirements, deals, other crew holds"
          rows="4"
          className={styles.textarea}
          disabled={submitStatus.loading}
        />
      </div>

      {/* Crew Check */}
      <div className={styles.formGroup}>
        <label htmlFor="crewCheck">
          Crew check
          <button
            type="button"
            className={styles.tooltipButton}
            onClick={() => toggleTooltip("crewCheck")}
            onMouseEnter={() => setShowTooltip("crewCheck")}
            onMouseLeave={() => setShowTooltip(null)}
            aria-label="More information about crew check"
            aria-describedby="crewCheckTooltip"
            disabled={submitStatus.loading}
          >
            ?
          </button>
        </label>
        {showTooltip === "crewCheck" && (
          <div id="crewCheckTooltip" className={styles.tooltip} role="tooltip">
            Add the names of crew that you would like to check for availability.
            Please also list pre dates, if required.
          </div>
        )}
        <textarea
          id="crewCheck"
          name="crewCheck"
          value={formData.crewCheck}
          onChange={handleChange}
          placeholder="Crew names and availability dates"
          rows="4"
          className={styles.textarea}
          disabled={submitStatus.loading}
        />
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
          <span>
            Job submitted successfully! We'll review your submission and get
            back to you shortly.
          </span>
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
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span>{submitStatus.error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className={styles.submitButton}
        disabled={submitStatus.loading}
      >
        {submitStatus.loading ? "Submitting..." : "Submit New Job"}
      </button>
    </form>
  );
};

export default NewJobForm;
