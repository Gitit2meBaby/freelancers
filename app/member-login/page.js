import React from "react";
import { Suspense } from "react";

import LoginForm from "./(components)/LoginForm";
import Spinner from "../components/Spinner";

import styles from "../styles/memberLogin.module.scss";

export const dynamic = "force-dynamic";
const page = () => {
  return (
    <section
      className={styles.memberLogin}
      data-page="plain"
      data-footer="noBorder"
    >
      <div className={styles.imageContainer}></div>

      <div className={styles.formContainer}>
        <div className={styles.content}>
          <h1>Member Login</h1>
          <Suspense
            fallback={
              <>
                <Spinner />
              </>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
};

export default page;
