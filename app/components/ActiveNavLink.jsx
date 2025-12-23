'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

import styles from '../styles/navigation.module.scss'

export default function ActiveNavLink({ href, children, className }) {
  const pathname = usePathname()
  const isActive = pathname === href
  
  const handleClick = () => {
    // Uncheck the navigation checkbox to close the menu
    const checkbox = document.getElementById('nav-toggle')
    if (checkbox) {
      checkbox.checked = false
    }
  }
  
  return (
    <Link 
      href={href}
      className={`${className} ${isActive ? styles.active : ''}`}
      onClick={handleClick}
    >
      {children}
    </Link>
  )
}