'use client'
import React from 'react'

import { useAuth } from '../AuthContext'



const ProfilePic = () => {
    const { isLoggedIn, user, logout } = useAuth();
    
  return (
    <div>
      
    </div>
  )
}

export default ProfilePic
