// app/screen-services/page.js
"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

import SearchBar from "../components/SearchBar";
import styles from "../styles/crewDirectory.module.scss";

const ScreenServicesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch("/api/screen-services");
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch services");
        }

        setCategories(result.data.categories);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  // Helper function to format slug into title case
  const formatLabel = (name) => {
    return name;
  };

  if (loading) {
    return (
      <section
        className={styles.crewDirectory}
        data-page="plain"
        data-footer="noBorder"
        data-spacing="large"
      >
        <div className={styles.crewHead}>
          <h1>Screen Services</h1>
        </div>
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Loading services...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={styles.crewDirectory}
        data-page="plain"
        data-footer="noBorder"
        data-spacing="large"
      >
        <div className={styles.crewHead}>
          <h1>Screen Services</h1>
        </div>
        <div style={{ textAlign: "center", padding: "4rem", color: "red" }}>
          <p>Error loading services: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
      data-spacing="large"
    >
      <div className={styles.crewHead}>
        <h1>Screen Services</h1>
      </div>

      <div className={styles.buttonSection}>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/screen-services/${category.slug}`}
            style={{ textDecoration: "none" }}
          >
            <button>{formatLabel(category.name)}</button>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ScreenServicesPage;
