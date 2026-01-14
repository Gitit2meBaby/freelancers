// app/components/News.jsx
"use client";
import React, { useState, useEffect } from "react";
import styles from "../styles/news.module.scss";

const News = () => {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const response = await fetch("/api/news");
      if (!response.ok) {
        throw new Error("Failed to fetch news");
      }
      const result = await response.json();
      setNewsItems(result.data || []);
    } catch (err) {
      console.error("Error fetching news:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.news}>
        <h2>News</h2>
        <div className={styles.loading}>Loading news...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.news}>
        <h2>News</h2>
        <div className={styles.error}>Unable to load news</div>
      </section>
    );
  }

  if (newsItems.length === 0) {
    return (
      <section className={styles.news}>
        <h2>News</h2>
        <div className={styles.noNews}>No news items available</div>
      </section>
    );
  }

  return (
    <section className={styles.news}>
      <h2>News</h2>
      {newsItems.map((item) => (
        <div key={item.id} className={styles.newsContainer}>
          <p>{item.title}</p>
          <a
            href={item.pdfUrl}
            download={item.pdfFileName}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.downloadLink}
          >
            Download
          </a>
        </div>
      ))}
    </section>
  );
};

export default News;
