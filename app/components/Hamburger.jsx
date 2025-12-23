import React from 'react'
import styles from '../styles/navigation.module.scss'

const Hamburger = () => {
  return (
    <label 
      htmlFor="nav-toggle"
      style={{ marginTop: "auto" }} 
      className={styles.hamburger}
      aria-label="Toggle navigation menu"
      aria-controls="main-navigation"
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 12H23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 6H23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M3 18H23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  )
}

export default Hamburger