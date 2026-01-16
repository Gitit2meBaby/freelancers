import React from "react";

import Banner from "./components/Banner";
import HomeButtons from "./components/HomeButtons";
import HomeSlider from "./components/HomeSlider";

import styles from "./styles/home.module.scss";

export default function Home() {
  return (
    <main className={styles.home} data-page="home" data-zindex="10">
      <Banner />
      <div className={styles.homeContainer}>
        <div className={styles.buttonContainer}>
          <HomeButtons />
        </div>
        <div className={styles.carouselContainer}>
          <HomeSlider />
        </div>
        <div className={styles.circleWrapper}>
          <div className={styles.circleAnimate}></div>
        </div>
      </div>
    </main>
  );
}
