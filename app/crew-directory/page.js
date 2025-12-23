"use client";
import React from "react";

import SearchBar from "../components/SearchBar";
import ButtonSection from "../components/ButtonSection";

import styles from "../styles/crewDirectory.module.scss";

import { CATEGORY_HIERARCHY } from "../../categoryHierarchy.js";

const page = () => {
  const topLevelCategories = Object.keys(CATEGORY_HIERARCHY);

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={styles.crewHead}>
        <h1>Crew Directory</h1>
        <SearchBar />
      </div>

      <ButtonSection list={topLevelCategories} />

      <div className={styles.downloadSection}>
        <select
          className={styles.downloadSelect}
          onChange={(e) => {
            if (e.target.value) {
              const link = document.createElement("a");
              link.href = e.target.value;
              link.download = "";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              e.target.value = ""; // Reset the select
            }
          }}
        >
          <option value="" disabled selected hidden>
            Download Crew Directory ▼
          </option>
          <option value="/pdf/crew-list.pdf">Download PDF</option>
          <option value="/csv/crew-list.xlsx">Download XLS</option>
        </select>
      </div>
    </section>
  );
};

export default page;
