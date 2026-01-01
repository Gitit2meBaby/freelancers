// app/screen-services/[slug]/page.js
"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import ScreenServiceCard from "@/app/components/ScreenServiceCard";
import styles from "@/app/styles/screenService.module.scss";

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCategoryServices() {
      try {
        const response = await fetch(`/api/screen-services/${params.slug}`);
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch category");
        }

        setCategoryData(result.data);
      } catch (err) {
        console.error("Error fetching category:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.slug) {
      fetchCategoryServices();
    }
  }, [params.slug]);

  if (loading) {
    return (
      <section
        className={styles.categoryPage}
        data-page="plain"
        data-footer="noBorder"
      >
        <div className={styles.loading}>Loading...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className={styles.categoryPage}
        data-page="plain"
        data-footer="noBorder"
      >
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <Link href="/screen-services" style={{ marginTop: "2rem" }}>
            ← Back to Screen Services
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.categoryPage}
      data-page="plain"
      data-footer="noBorder"
    >
      {/* Header with back link */}
      <div className={styles.categoryHeader}>
        <Link href="/screen-services" className={styles.backLink}>
          <span className={styles.backArrow}>←</span>
        </Link>
        <h1>
          <Link
            href="/screen-services"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            Screen Service: {categoryData?.category.name}
          </Link>
        </h1>
      </div>

      {/* Services Grid */}
      <div className={styles.servicesGrid}>
        {categoryData?.services.map((service) => (
          <ScreenServiceCard key={service.id} service={service} />
        ))}
      </div>

      {/* No services message */}
      {categoryData?.services.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>No services found in this category.</p>
        </div>
      )}
    </section>
  );
}
