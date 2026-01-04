"use client";
import React from "react";

import styles from "../../styles/crewDirectory.module.scss";

export default function DownloadSelect(
  title,
  pdfValue,
  xlsxValue,
  crewPdfValue,
  crewXlsxValue
) {
  const handleDownload = (e) => {
    if (e.target.value) {
      const link = document.createElement("a");
      link.href = e.target.value;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      e.target.value = ""; // Reset the select
    }
  };

  return (
    <div className={styles.downloadSection}>
      <select
        className={styles.downloadSelect}
        onChange={handleDownload}
        defaultValue=""
      >
        <option value="" disabled hidden>
          {`${title.title} ▼`}
        </option>
        {pdfValue && <option value={pdfValue}>Download PDF</option>}
        {xlsxValue && <option value={xlsxValue}>Download XLS</option>}
        {crewPdfValue && (
          <option value={crewPdfValue}>Download Crew PDF</option>
        )}
        {crewXlsxValue && (
          <option value={crewXlsxValue}>Download Crew XLS</option>
        )}
      </select>
    </div>
  );
}
