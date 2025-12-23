import React from "react";

import LoginForm from "./(components)/LoginForm";

import styles from "../styles/memberLogin.module.scss";
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
          <LoginForm />
        </div>
      </div>
    </section>
  );
};

export default page;
