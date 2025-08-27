'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { isAdmin, canAccessFeature } from '@/lib/auth'
import PersonalSettings from '@/components/settings/PersonalSettings'
import EnterpriseUserSettings from '@/components/settings/EnterpriseUserSettings'
import EnterpriseAdminSettings from '@/components/settings/EnterpriseAdminSettings'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()

  if (!user) {
    router.push('/login')
    return null
  }

  const renderSettings = () => {
    switch (user.role) {
      case 'personal':
        return <PersonalSettings user={user} />
      case 'enterprise_user':
        return <EnterpriseUserSettings user={user} />
      case 'enterprise_admin':
        return <EnterpriseAdminSettings user={user} />
      default:
        return <PersonalSettings user={user} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        {renderSettings()}
      </div>
    </div>
  )
}