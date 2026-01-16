// freelancers/app/reset-password/page.js
import React, { Suspense } from "react";

import ResetPasswordClient from "./(components)/ResetPasswordClient";
import Spinner from "../components/Spinner";

import styles from "../styles/forgotPassword.module.scss";

const page = () => {
  return (
    <section
      className={styles.loginPage}
      data-footer="noBorder"
      data-page="plain"
    >
      <Suspense
        fallback={
          <>
            <Spinner />
          </>
        }
      >
        <ResetPasswordClient />
      </Suspense>
    </section>
  );
};

export default page;
