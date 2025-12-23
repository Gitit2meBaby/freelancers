// Find link to first button********************

"use server";
import React from "react";
import Link from "next/link";

import styles from "../styles/bookingGuidelines.module.scss";

const page = () => {
  return (
    <section className={styles.bookingGuidelines} data-page="plain">
      <div className={styles.container}>
        <h1>Booking Guidelines</h1>
        <p>
          This guide has been produced to provide a reference of best practice
          processes for the engagement of crew in Victoria. We trust all
          production companies understand our booking guidelines and if not
          please call Freelancers Promotions on<br></br> +613 9682 2722.
        </p>
        <div className={styles.btns}>
          <Link href={""} className={styles.linkButton}>
            Longform Guidelines
          </Link>
          <Link
            href="../public/pdf/Crew-Booking-Guidelines-July-25.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkButton}
          >
            TVC Booking Guidelines
          </Link>
        </div>
      </div>
    </section>
  );
};

export default page;
