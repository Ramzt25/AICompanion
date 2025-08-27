'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, getUserByEmail, TEST_USERS } from '@/lib/auth'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  switchUser: (userId: string) => void // For demo purposes
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user session
    const storedUserId = localStorage.getItem('ai-companion-user-id')
    if (storedUserId) {
      const foundUser = TEST_USERS.find(u => u.id === storedUserId)
      if (foundUser) {
        setUser(foundUser)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const foundUser = getUserByEmail(email)
    if (foundUser) {
      // In a real app, you'd validate the password here
      // For demo purposes, any password works
      setUser(foundUser)
      localStorage.setItem('ai-companion-user-id', foundUser.id)
      setIsLoading(false)
      return true
    }
    
    setIsLoading(false)
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('ai-companion-user-id')
  }

  const switchUser = (userId: string) => {
    const foundUser = TEST_USERS.find(u => u.id === userId)
    if (foundUser) {
      setUser(foundUser)
      localStorage.setItem('ai-companion-user-id', foundUser.id)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, switchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}