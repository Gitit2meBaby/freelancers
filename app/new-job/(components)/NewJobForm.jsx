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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO
    // Handle form submission
    console.log("Form submitted:", formData);
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
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="jobType"
              value="Documentary"
              checked={formData.jobType === "Documentary"}
              onChange={handleChange}
              required
              aria-required="true"
            />
            <span>Documentary</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="jobType"
              value="Feature Film"
              checked={formData.jobType === "Feature Film"}
              onChange={handleChange}
              required
              aria-required="true"
            />
            <span>Feature Film</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="jobType"
              value="TV Series"
              checked={formData.jobType === "TV Series"}
              onChange={handleChange}
              required
              aria-required="true"
            />
            <span>TV Series</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="jobType"
              value="Music Video"
              checked={formData.jobType === "Music Video"}
              onChange={handleChange}
              required
              aria-required="true"
            />
            <span>Music Video</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="jobType"
              value="Online Content"
              checked={formData.jobType === "Online Content"}
              onChange={handleChange}
              required
              aria-required="true"
            />
            <span>Online Content</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="jobType"
              value="Promotional"
              checked={formData.jobType === "Promotional"}
              onChange={handleChange}
              required
              aria-required="true"
            />
            <span>Promotional</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="jobType"
              value="Stills"
              checked={formData.jobType === "Stills"}
              onChange={handleChange}
              required
              aria-required="true"
            />
            <span>Stills</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="jobType"
              value="TV Commercial"
              checked={formData.jobType === "TV Commercial"}
              onChange={handleChange}
              required
              aria-required="true"
            />
            <span>TV Commercial</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              name="jobType"
              value="Stills and Motion"
              checked={formData.jobType === "Stills and Motion"}
              onChange={handleChange}
              required
              aria-required="true"
            />
            <span>Stills and Motion</span>
          </label>
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
          aria-describedby="directorHelp"
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
          aria-describedby="producerHelp"
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
          aria-describedby="dopHelp"
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
          aria-describedby="locationHelp"
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
        />
      </div>

      {/* Submit Button */}
      <button type="submit" className={styles.submitButton}>
        Submit New Job
      </button>
    </form>
  );
};

export default NewJobForm;
