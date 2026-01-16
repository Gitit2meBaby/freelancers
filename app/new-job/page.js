// app/new-job/page.js
import React from "react";
import { Suspense } from "react";

import NewJobForm from "./(components)/NewJobForm";

import styles from "../styles/newJob.module.scss";

export const dynamic = "force-dynamic";
const page = () => {
  return (
    <section className={styles.newJob} data-page="plain" data-footer="noBorder">
      <div className={styles.formContainer}>
        <div className={styles.content}>
          <h1>New Job</h1>
          <div className={styles.introText}>
            <p>
              Submit a new job to Freelancers Promotions. Please provide as much
              detail as possible about your production requirements, including
              dates, locations, and crew needs.
            </p>
          </div>
        </div>

        <Suspense fallback={null}>
          <NewJobForm />
        </Suspense>
      </div>

      <div className={styles.imageContainer}></div>
    </section>
  );
};

export default page;
