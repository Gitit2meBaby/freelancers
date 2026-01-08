// "use client";
// import React from "react";
// import styles from "../../styles/crewDirectory.module.scss";

// export default function DownloadSelect({
//   title,
//   department,
//   crewData,
//   type = "both", // "both", "pdf", "excel"
// }) {
//   const handleDownload = async (e) => {
//     const format = e.target.value;
//     if (!format) return;

//     try {
//       // Show loading state
//       e.target.disabled = true;
//       e.target.style.opacity = "0.6";

//       // Call API route to generate file
//       const response = await fetch(`/api/generate-crew-download`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           format,
//           department,
//           crewData,
//         }),
//       });

//       if (!response.ok) {
//         throw new Error("Failed to generate file");
//       }

//       // Get the blob from the response
//       const blob = await response.blob();

//       // Create download link
//       const url = window.URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = url;

//       // Set filename based on format
//       const timestamp = new Date().toISOString().split("T")[0];
//       const filename = `${department}-crew-list-${timestamp}.${
//         format === "pdf" ? "pdf" : "xlsx"
//       }`;
//       link.download = filename;

//       // Trigger download
//       document.body.appendChild(link);
//       link.click();

//       // Cleanup
//       document.body.removeChild(link);
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error("Download error:", error);
//       alert("Failed to generate file. Please try again.");
//     } finally {
//       // Reset select and re-enable
//       e.target.value = "";
//       e.target.disabled = false;
//       e.target.style.opacity = "1";
//     }
//   };

//   const showPDF = type === "both" || type === "pdf";
//   const showExcel = type === "both" || type === "excel";

//   return (
//     <div className={styles.downloadSection}>
//       <select
//         className={styles.downloadSelect}
//         onChange={handleDownload}
//         defaultValue=""
//       >
//         <option value="" disabled hidden>
//           {title} ▼
//         </option>
//         {showPDF && <option value="pdf">Download PDF</option>}
//         {showExcel && <option value="excel">Download XLSX</option>}
//       </select>
//     </div>
//   );
// }

"use client";
import React, { useState } from "react";
import styles from "../../styles/crewDirectory.module.scss";

export default function DownloadSelect({
  title,
  downloadType,
  departmentSlug,
  skillSlug,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async (e) => {
    const format = e.target.value;
    if (!format) return;

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
        apiUrl += `skill/${departmentSlug}/${skillSlug}?format=${format}`;
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

      // Set filename based on type and format
      const timestamp = new Date().toISOString().split("T")[0];
      let filename = "crew-list";

      if (downloadType === "skill" && skillSlug) {
        filename = `${skillSlug}-${timestamp}`;
      } else if (downloadType === "department" && departmentSlug) {
        filename = `${departmentSlug}-${timestamp}`;
      } else {
        filename = `all-crew-${timestamp}`;
      }

      link.download = `${filename}.${format}`;

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
      e.target.value = ""; // Reset the select
    }
  };

  return (
    <div className={styles.downloadSection}>
      <select
        className={styles.downloadSelect}
        onChange={handleDownload}
        defaultValue=""
        disabled={isLoading}
      >
        <option value="" disabled hidden>
          {isLoading ? "Generating..." : `${title} ▼`}
        </option>
        <option value="pdf">Download PDF</option>
        <option value="xlsx">Download Excel</option>
      </select>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
