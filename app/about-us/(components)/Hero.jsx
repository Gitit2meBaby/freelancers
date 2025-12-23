import React from 'react'
import Image from 'next/image'

import styles from '../../styles/aboutUs.module.scss'

import heroDesktop from '../../../public/about/desk.webp'
const Hero = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGrid}>
        {/* Background Image */}
        <div className={styles.imageContainer}>
          <Image 
            src={heroDesktop} 
            alt="Man walking on a stage in the mountains" 
            fill
            priority
            sizes="100vw"
            className={styles.heroImage}
          />
        </div>

        {/* Content Box */}
        <div className={styles.contentBox}>
          <h1>About Freelancers Promotions</h1>
          <p>
            Freelancers Promotions is owned and operated by Martine Broderick & Liz Gossan. 
            Martine has been part of the business for 20 years and prior was a freelance 
            Production Manager. Liz Gossan brings her finance skills to the business having 
            worked with larger companies as an accountant and is a fully qualified CPA.
          </p>
        </div>
      </div>
    </section>
  )
}

export default Hero