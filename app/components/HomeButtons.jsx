import React from 'react'
import styles from './styles/homeButtons.module.scss'

const HomeButtons = () => {
  return (
    <section className={styles.homeButtons}>
      <button className={styles.homeButton}>Crew Directory</button>
      <button className={styles.homeButton}>Screen Services</button>
      <button className={styles.homeButton}>Booking Guidelines</button>
    </section>
  )
}

export default HomeButtons
