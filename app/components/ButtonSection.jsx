import React from "react";

import styles from "../styles/crewDirectory.module.scss";
const ButtonSection = ({ list }) => {
  // Helper function to format slug into title case
  const formatLabel = (slug) => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className={styles.buttonSection}>
      {list.map((item) => (
        <button key={item}>{formatLabel(item)}</button>
      ))}
    </div>
  );
};

export default ButtonSection;
