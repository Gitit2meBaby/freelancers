import React from "react";
import Image from "next/image";

import styles from "../styles/contactUs.module.scss";

import ContactForm from "../components/ContactForm";

const page = () => {
  return (
    <section
      className={styles.contactUs}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={styles.formContainer}>
        <div className={styles.content}>
          <h1>Contact Us</h1>

          <div className={styles.gridContainer}>
            <div className={styles.details}>
              <p>Email</p>
              <a
                href="mailto:info@freelancers.com.au"
                style={{ color: "#676900" }}
              >
                info@freelancers.com.au
              </a>
            </div>

            <div className={styles.details}>
              <p>Phone</p>
              <a href="tel:+61396822722">+613 9682 2722</a>
            </div>
          </div>
        </div>

        <ContactForm />
      </div>

      <div className={styles.imageContainer}></div>
    </section>
  );
};

export default page;
