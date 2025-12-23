
import React from 'react'
import Image from 'next/image'


import styles from '../styles/header.module.scss'

import Hamburger from './Hamburger'
import ProfilePic from './ProfilePic'

import deskLogo from '../logo.png'
import mobLogo from '../../public/logos/logo40x50.png'

const Header = () => {

  return (
    <header className={styles.header}>
      <Hamburger />
      <div className={styles.logo}>
        <Image src={deskLogo} alt="Freelancers Logo" width={300} height={66} className={styles.deskLogo} />
        <Image src={mobLogo} alt="Freelancers Logo" width={40} height={50} className={styles.mobLogo} />
      </div>
      <div className={`${styles.profilePic}`}>
        <ProfilePic />
      </div>
    </header>
  )
}

export default Header
