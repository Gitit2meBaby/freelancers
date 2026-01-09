"use client";
import React, { useState, useRef } from "react";
import styles from "../../styles/crewDirectory.module.scss";

export default function DownloadSelect({
  title,
  downloadType,
  departmentSlug,
  skillSlug,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const selectRef = useRef(null);

  const handleDownload = async (e) => {
    const format = e.target.value;
    if (!format) return;

    // Immediately reset select to show default option
    e.target.value = "";

    setIsLoading(true);
    setError(null);

    try {
      // Build the API endpoint based on download type
      let apiUrl = "/api/downloads/";

      if (downloadType === "all") {
        apiUrl += `all?format=${format}`;
      } else if (downloadType === "department" && departmentSlug) {
        apiUrl += `department/${departmentSlug}?format=${format}`;
      } else if (downloadType === "skill" && departmentSlug && skillSlug) {
        apiUrl += `department/${departmentSlug}/${skillSlug}?format=${format}`;
      } else {
        throw new Error("Invalid download configuration");
      }

      // Fetch the file from the API
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `download.${format}`;

      if (contentDisposition) {
        // ✅ FIXED: Use non-greedy match and properly handle quotes
        // Matches: filename="Art Department.pdf" OR filename=Art%20Department.pdf
        const filenameMatch = contentDisposition.match(
          /filename=["']?([^"';]+)["']?/i
        );
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].trim();
        }
      }

      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      setError("Failed to download file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.downloadSection}>
      <select
        ref={selectRef}
        className={styles.downloadSelect}
        onChange={handleDownload}
        value="" // ✅ Always controlled to empty string
        disabled={isLoading}
      >
        <option value="" disabled hidden>
          {isLoading ? "Downloading..." : `${title} ▼`}
        </option>
        <option value="pdf">Download PDF</option>
        <option value="xlsx">Download Excel</option>
      </select>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
