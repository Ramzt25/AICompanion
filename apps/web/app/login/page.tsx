'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { TEST_USERS } from '@/lib/auth'
import { Eye, EyeOff, User, Building, Shield } from 'lucide-react'

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    const success = await login(email, password)
    if (!success) {
      setError('Invalid email or password')
    }
  }

  const quickLogin = (userEmail: string) => {
    setEmail(userEmail)
    setPassword('demo123') // Demo password
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'personal': return <User className="w-4 h-4" />
      case 'enterprise_user': return <Building className="w-4 h-4" />
      case 'enterprise_admin': return <Shield className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'personal': return 'bg-blue-100 text-blue-800'
      case 'enterprise_user': return 'bg-green-100 text-green-800'
      case 'enterprise_admin': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleName = (role: string) => {
    switch (role) {
      case 'personal': return 'Personal User'
      case 'enterprise_user': return 'Enterprise User'
      case 'enterprise_admin': return 'Enterprise Admin'
      default: return role
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              AI Knowledge Companion
            </h1>
            <p className="text-gray-600">
              Sign in to access your personalized AI assistant
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Demo Accounts</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {TEST_USERS.map((user) => (
                <button
                  key={user.id}
                  onClick={() => quickLogin(user.email)}
                  className="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.email}
                        </div>
                        {user.organizationName && (
                          <div className="text-xs text-gray-400">
                            {user.organizationName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span>{getRoleName(user.role)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <strong>Demo Mode:</strong> Click any user above to login instantly. In production, 
              these would be real accounts with proper authentication.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}