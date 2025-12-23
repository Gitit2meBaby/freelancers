"use server";
import React from "react";

import Hero from "./(components)/Hero";
import Banner from "./(components)/Banner";
import Team from "./(components)/Team";

import styles from "../styles/aboutUs.module.scss";
const page = () => {
  return (
    <section className={styles.aboutUs} data-page="plain">
      <Hero />
      <Banner />
      <Team />
    </section>
  );
};

export default page;
