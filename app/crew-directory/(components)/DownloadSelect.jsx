"use client";
import React from "react";

import styles from "../../styles/crewDirectory.module.scss";

export default function DownloadSelect() {
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
          Download Crew Directory ▼
        </option>
        <option value="/pdf/crew-list.pdf">Download PDF</option>
        <option value="/csv/crew-list.xlsx">Download XLS</option>
      </select>
    </div>
  );
}
