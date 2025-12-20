'use server'
import React from 'react'
import ImageCarousel from './ImageCarousel'

import home1 from '../public/home/home1.webp'
import home2 from '../public/home/home2.webp'
import home3 from '../public/home/home3.webp'
import home4 from '../public/home/home4.webp'
import home5 from '../public/home/home5.webp'
import home6 from '../public/home/home6.webp'
import home7 from '../public/home/home7.webp'
import home8 from '../public/home/home8.webp'
import home9 from '../public/home/home9.webp'
import home10 from '../public/home/home10.webp'

const HomeSlider = () => {
    const topRow = [home1, home2, home3, home4, home5]
    const bottomRow = [home6, home7, home8, home9, home10]

  return (
    <section>
      <ImageCarousel images={topRow} direction="left" />
      <ImageCarousel images={bottomRow} direction="right" />
    </section>
  )
}

export default HomeSlider