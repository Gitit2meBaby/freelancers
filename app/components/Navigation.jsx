'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './Navigation.module.scss'

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  const navLinks = [
    { href: '/crew-directory', label: 'Crew Directory' },
    { href: '/screen-services', label: 'Screen Services' },
    { href: '/booking-guidelines', label: 'Booking Guidelines' },
    { href: '/about-us', label: 'About Us' },
    { href: '/contact-us', label: 'Contact Us' },
    { href: '/member-login', label: 'Member Login' },
  ]

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className={styles.hamburger}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="main-navigation"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Slide-in Navigation */}
      <nav
        id="main-navigation"
        className={`${styles.navigation} ${isOpen ? styles.open : ''}`}
        aria-label="Main navigation"
      >
        {/* Close Button */}
        <button
          onClick={closeMenu}
          className={styles.closeButton}
          aria-label="Close navigation menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Navigation Links */}
        <ol className={styles.navList}>
          {navLinks.map((link, index) => (
            <li key={link.href} className={styles.navItem}>
              <Link
                href={link.href}
                onClick={closeMenu}
                className={styles.navLink}
                aria-current={undefined} // You can set this dynamically based on current page
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}

export default Navigation