import React from "react";
import Image from "next/image";
import Link from "next/link";

import styles from "../styles/header.module.scss";

import Hamburger from "./Hamburger";
import ProfilePic from "./ProfilePic";

import deskLogo from "../logo.png";
import mobLogo from "../../public/logos/logoMob.png";

const Header = () => {
  return (
    <header className={styles.header}>
      <Hamburger />
      <div className={styles.logo}>
        <Link href={"/"}>
          <Image
            src={deskLogo}
            alt="Freelancers Logo"
            width={300}
            height={66}
            className={styles.deskLogo}
            priority
          />
        </Link>
        <Link href={"/"}>
          <Image
            src={mobLogo}
            alt="Freelancers Logo"
            width={40}
            height={50}
            className={styles.mobLogo}
            priority
          />
        </Link>
      </div>
      <div className={`${styles.profilePic}`}>
        <ProfilePic />
      </div>
    </header>
  );
};

export default Header;
