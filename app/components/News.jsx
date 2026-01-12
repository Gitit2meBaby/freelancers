// import React from "react";

// import styles from "../styles/news.module.scss";

// const News = () => {
//   return (
//     <section className={styles.news}>
//       <h2>News</h2>
//       <div className={styles.newsContainer}>
//         <p>Drama Prod Graph Oct 25</p>
//         <a
//           href="/news/National-Graph_29Sep25.pdf"
//           download="National-Graph_29Sep25.pdf"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Download
//         </a>
//       </div>
//       <div className={styles.newsContainer}>
//         <p>TVC Production Report Oct 25</p>
//         <a
//           href="/news/TVC-Report_29Sep25.pdf"
//           download="TVC-Report_29Sep25.pdf"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Download
//         </a>
//       </div>
//       <div className={styles.newsContainer}>
//         <p>Crew News Oct 25</p>
//         <a
//           href="/news/CrewNews_29Sep255.pdf"
//           download="CrewNews_29Sep255.pdf"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Download
//         </a>
//       </div>
//       <div className={styles.newsContainer}>
//         <p>Drama Production Report Oct 25</p>
//         <a
//           href="/news/Drama-Prod-Report_29Sep25.pdf"
//           download="Drama-Prod-Report_29Sep25.pdf"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Download
//         </a>
//       </div>
//     </section>
//   );
// };

// export default News;

// app/components/News.jsx - UPDATED VERSION
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
