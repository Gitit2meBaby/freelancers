'use client'
import React, { useRef } from 'react'
import Image from 'next/image'

import styles from '../../styles/team.module.scss'

const TeamMember = ({ image, alt, name, title, bio }) => {
  const detailsRef = useRef(null)

  const handleShowLess = (e) => {
    e.preventDefault()
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
  }

  return (
    <div className={styles.card}>
      <Image 
        src={image} 
        alt={alt} 
        width={311} 
        height={311} 
        className={styles.teamImage} 
      />
      <h3>{name}</h3>
      <h4>{title}</h4>
      
      <details className={styles.bio} ref={detailsRef}>
        <summary>
          <span className={styles.truncated}>
            {bio}
          </span>
          <span className={styles.readMore} aria-label={`Read more about ${name}`}>
            Read more
          </span>
        </summary>
        <div className={styles.fullText}>
          <p>{bio}</p>
          <button 
            className={styles.showLess} 
            onClick={handleShowLess}
            aria-label="Show less"
          >
            Show less
          </button>
        </div>
      </details>
    </div>
  )
}

export default TeamMember