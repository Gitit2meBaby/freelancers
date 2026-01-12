import styles from "../styles/navigation.module.scss";

import ActiveNavLink from "./ActiveNavLink";

const Navigation = () => {
  const navLinks = [
    { href: "/crew-directory", label: "CREW DIRECTORY" },
    { href: "/screen-services", label: "SCREEN SERVICES" },
    { href: "/booking-guidelines", label: "BOOKING GUIDELINES" },
    { href: "/about-us", label: "ABOUT US" },
    { href: "/contact-us", label: "CONTACT US" },
    { href: "/member-login", label: "MEMBER LOGIN" },
    { href: "/new-job", label: "NEW JOB" },
  ];

  return (
    <>
      {/* Hidden checkbox that controls the nav state */}
      <input type="checkbox" id="nav-toggle" className={styles.navToggle} />

      {/* Overlay - clicking it closes the menu */}
      <label
        htmlFor="nav-toggle"
        className={styles.overlay}
        aria-label="Close navigation"
      />

      {/* Slide-in Navigation */}
      <nav
        id="main-navigation"
        className={styles.navigation}
        aria-label="Main navigation"
      >
        {/* Close Button */}
        <label
          htmlFor="nav-toggle"
          className={styles.closeButton}
          aria-label="Close navigation menu"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M28 12L12 28"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 12L28 28"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </label>

        {/* Navigation Links */}
        <ul className={styles.navList}>
          {navLinks.map((link) => (
            <li key={link.href} className={styles.navItem}>
              <ActiveNavLink href={link.href} className={styles.navLink}>
                {link.label}
              </ActiveNavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};

export default Navigation;
