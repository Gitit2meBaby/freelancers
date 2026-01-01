import React from "react";
import Link from "next/link";
import Image from "next/image";

import styles from "../styles/footer.module.scss";

import logo from "../../public/logos/logoMob.png";
const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInfo}>
        <Image src={logo} alt="FreelancersLogo" width={40} height={50} />
        <p>
          Freelancers Promotions acknowledges the Traditional Owners of country
          throughout Victoria and pay our respects to the Elders, past and
          present.
        </p>
      </div>
      <div className={styles.footerSection}>
        <h3>Sitemap</h3>
        <ul>
          <li>
            <Link href="/crew-directory">Crew Directory</Link>
          </li>
          <li>
            <Link href="/screen-services">Screen Services</Link>
          </li>
          <li>
            <Link href="/booking-guidelines">Booking Guidelines</Link>
          </li>
          <li>
            <Link href="/member-login">Member Login</Link>
          </li>
        </ul>
      </div>
      <div className={styles.footerSection}>
        <h3>Company</h3>
        <ul>
          <li>
            <Link href="/about-us">About Us</Link>
          </li>
          <li>
            <Link href="/contact-us">Contact Us</Link>
          </li>
        </ul>
      </div>
      <div className={styles.footerSection}>
        <h3>Contact us at</h3>
        <ul>
          <li>
            <Link href="https://goo.gl/maps/rkXQonMMRqg8tMKQ6">
              PO Box 5010, South Melbourne, Vic 3205
            </Link>
          </li>
          <li>
            <Link href="mailto:info@freelancers.com.au">
              info@freelancers.com.au
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
