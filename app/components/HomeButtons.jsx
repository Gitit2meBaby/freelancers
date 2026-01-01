import React from "react";
import styles from "../styles/homeButtons.module.scss";
import Link from "next/link";

const HomeButtons = () => {
  return (
    <section className={styles.homeButtonsContainer}>
      <div className={styles.homeButtons}>
        <Link href="/crew-directory" className={styles.homeButton}>
          Crew Directory
        </Link>
        <Link href="/screen-services" className={styles.homeButton}>
          Screen Services
        </Link>
        <Link href="/booking-guidelines" className={styles.homeButton}>
          Booking Guidelines
        </Link>
      </div>
    </section>
  );
};

export default HomeButtons;
