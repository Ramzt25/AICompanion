'use client'

import { useState } from 'react'
import { User, getOrganizationById } from '@/lib/auth'
import { Save, Building, Zap, FileText, Lock, Globe, Bell, Palette, Clock } from 'lucide-react'

interface EnterpriseUserSettingsProps {
  user: User
}

export default function EnterpriseUserSettings({ user }: EnterpriseUserSettingsProps) {
  const [settings, setSettings] = useState(user.settings)
  const [isSaving, setIsSaving] = useState(false)
  const organization = user.organizationId ? getOrganizationById(user.organizationId) : null

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  const availableSkills = settings.allowedSkills || []
  const allSkills = [
    { id: 'osha-compliance', name: 'OSHA Compliance', description: 'Safety regulation analysis' },
    { id: 'contract-analysis', name: 'Contract Analysis', description: 'Legal document review' },
    { id: 'project-management', name: 'Project Management', description: 'Timeline and resource tracking' },
    { id: 'legal-analysis', name: 'Legal Analysis', description: 'Legal document interpretation' },
    { id: 'compliance-check', name: 'Compliance Check', description: 'Regulatory compliance verification' },
    { id: 'risk-assessment', name: 'Risk Assessment', description: 'Project risk evaluation' }
  ]

  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' }
  ]

  const personalities = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'technical', label: 'Technical' }
  ]

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-6">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-16 h-16 rounded-full"
          />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
            <div className="flex items-center space-x-2 mt-1">
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Enterprise User
              </div>
              {organization && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <Building className="w-3 h-3 mr-1" />
                  {organization.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Organization Info */}
      {organization && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center mb-3">
            <Building className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-900">Organization</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">Company:</span>
              <span className="ml-2 text-blue-700">{organization.name}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Industry:</span>
              <span className="ml-2 text-blue-700">{organization.industry}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Plan:</span>
              <span className="ml-2 text-blue-700 capitalize">{organization.subscription.plan}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Status:</span>
              <span className="ml-2 text-blue-700 capitalize">{organization.subscription.status}</span>
            </div>
          </div>
        </div>
      )}

      {/* Personal Preferences */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Palette className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Personal Preferences</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {themes.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Personality</label>
            <select
              value={settings.aiPersonality}
              onChange={(e) => setSettings({ ...settings, aiPersonality: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {personalities.map((personality) => (
                <option key={personality.value} value={personality.value}>
                  {personality.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Notifications</label>
              <p className="text-sm text-gray-600">Receive updates and alerts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Available Skills - Controlled by Admin */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Zap className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Available Skills</h3>
          <div className="ml-auto" title="Controlled by admin">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800">
            <Lock className="w-4 h-4 inline mr-1" />
            Your available skills are managed by your organization administrator.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {allSkills.map((skill) => {
            const isAvailable = availableSkills.includes(skill.id)
            return (
              <div
                key={skill.id}
                className={`p-4 rounded-lg border ${
                  isAvailable
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{skill.name}</h4>
                  {isAvailable ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  ) : (
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-600">{skill.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Document Access */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <FileText className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Document Access</h3>
          <div className="ml-auto" title="Controlled by admin">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-900">
                Access Level: {settings.documentAccess?.replace('_', ' ').toUpperCase() || 'STANDARD'}
              </h4>
              <p className="text-sm text-blue-700">
                {settings.documentAccess === 'all' && 'You have access to all organization documents'}
                {settings.documentAccess === 'department' && 'You have access to documents in your department'}
                {settings.documentAccess === 'limited' && 'You have limited document access'}
                {!settings.documentAccess && 'Standard document access permissions'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Model Preference */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Globe className="w-5 h-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">AI Model Preference</h3>
          <div className="ml-auto" title="Controlled by admin">
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border ${
            settings.aiModelPreference === 'standard'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'
          }`}>
            <h4 className="font-medium text-gray-900">Standard Model</h4>
            <p className="text-sm text-gray-600">General-purpose AI assistant</p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            settings.aiModelPreference === 'custom'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200'
          }`}>
            <h4 className="font-medium text-gray-900">Custom Model</h4>
            <p className="text-sm text-gray-600">Industry-specific trained model</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}