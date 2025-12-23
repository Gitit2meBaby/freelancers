import React from 'react'

import styles from '../styles/header.module.scss'
const Hamburger = () => {
    return (
        <div style={{marginTop: "auto"}} className={styles.hamburger}>
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          aria-label="Open navigation menu"
          aria-expanded="false"
          aria-controls="main-navigation"
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
            </div>
  )
}

export default Hamburger


