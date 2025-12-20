'use client'
import { useEffect, useRef } from 'react'
import Image from 'next/image'
import styles from './ImageCarousel.module.scss'

const ImageCarousel = ({ images, direction = 'left' }) => {
  const trackRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const slides = track.children
    const slideWidth = slides[0].offsetWidth
    const totalWidth = slideWidth * images.length

    // Set initial position based on direction
    if (direction === 'right') {
      track.style.transform = `translateX(-${totalWidth}px)`
    }

    const handleAnimationIteration = () => {
      track.style.transition = 'none'
      
      if (direction === 'left') {
        track.style.transform = 'translateX(0)'
      } else {
        track.style.transform = `translateX(-${totalWidth}px)`
      }
      
      void track.offsetHeight
      
      track.style.transition = 'transform 30s linear'
      
      if (direction === 'left') {
        track.style.transform = `translateX(-${totalWidth}px)`
      } else {
        track.style.transform = 'translateX(0)'
      }
    }

    track.addEventListener('transitionend', handleAnimationIteration)

    return () => {
      track.removeEventListener('transitionend', handleAnimationIteration)
    }
  }, [images.length, direction])

  const extendedImages = [...images, ...images, ...images]

  return (
    <div className={styles.carouselContainer}>
      <div 
        ref={trackRef}
        className={`${styles.carouselTrack} ${direction === 'right' ? styles.reverse : ''}`}
        aria-label="Image carousel"
      >
        {extendedImages.map((image, index) => (
          <div
            key={`slide-${index}`}
            className={styles.slide}
          >
            <Image
              src={image}
              alt={`Slide ${index + 1}`}
              width={388}
              height={218}
              className={styles.carouselImage}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default ImageCarousel