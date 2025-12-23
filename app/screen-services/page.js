"use client";
import React from "react";

import SearchBar from "../components/SearchBar";
import ButtonSection from "../components/ButtonSection";

import styles from "../styles/crewDirectory.module.scss";

import { SCREEN_SERVICES } from "../../screen-services-data.js";

const page = () => {
  const services = SCREEN_SERVICES.services.map((service) => service.name);

  return (
    <section
      className={styles.crewDirectory}
      data-page="plain"
      data-footer="noBorder"
      data-spacing="large"
    >
      <div className={styles.crewHead}>
        <h1>Screen Services</h1>
      </div>

      <ButtonSection list={services} />
    </section>
  );
};

export default page;
