import React from "react";

import styles from "../styles/news.module.scss";

const News = () => {
  return (
    <section className={styles.news}>
      <h2>News</h2>
      <div className={styles.newsContainer}>
        <p>Drama Prod Graph Oct 25</p>
        <a
          href="/news/National-Graph_29Sep25.pdf"
          download="National-Graph_29Sep25.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </a>
      </div>
      <div className={styles.newsContainer}>
        <p>TVC Production Report Oct 25</p>
        <a
          href="/news/TVC-Report_29Sep25.pdf"
          download="TVC-Report_29Sep25.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </a>
      </div>
      <div className={styles.newsContainer}>
        <p>Crew News Oct 25</p>
        <a
          href="/news/CrewNews_29Sep255.pdf"
          download="CrewNews_29Sep255.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </a>
      </div>
      <div className={styles.newsContainer}>
        <p>Drama Production Report Oct 25</p>
        <a
          href="/news/Drama-Prod-Report_29Sep25.pdf"
          download="Drama-Prod-Report_29Sep25.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download
        </a>
      </div>
    </section>
  );
};

export default News;
