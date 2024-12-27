'use client'

import { useSession } from "next-auth/react"
import { GlobalNotification } from './GlobalNotification'

export function AuthCheck() {
  const { status } = useSession()
  const isAuthenticated = status === "authenticated"
  
  if (isAuthenticated) {
    return <GlobalNotification />
  }
  return null
} 