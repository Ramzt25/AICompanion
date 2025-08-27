'use client'

import { useState } from 'react'
import { User, getOrganizationById, getUsersByOrganization, TEST_USERS } from '@/lib/auth'
import { Save, Building, Users, Settings, Shield, Globe, CreditCard, Zap, FileText, Clock, Brain, Lock, Plus, Trash2, Edit3 } from 'lucide-react'

interface EnterpriseAdminSettingsProps {
  user: User
}

export default function EnterpriseAdminSettings({ user }: EnterpriseAdminSettingsProps) {
  const [settings, setSettings] = useState(user.settings)
  const [activeSection, setActiveSection] = useState('organization')
  const [isSaving, setIsSaving] = useState(false)
  const organization = user.organizationId ? getOrganizationById(user.organizationId) : null
  const organizationUsers = user.organizationId ? getUsersByOrganization(user.organizationId) : []

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  const sections = [
    { id: 'organization', label: 'Organization', icon: Building },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'ai-models', label: 'AI Models', icon: Brain },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'personal', label: 'Personal', icon: Settings }
  ]

  const renderOrganizationSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={settings.organizationSettings?.companyName || ''}
              onChange={(e) => setSettings({
                ...settings,
                organizationSettings: {
                  ...settings.organizationSettings!,
                  companyName: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
            <select
              value={settings.organizationSettings?.industry || ''}
              onChange={(e) => setSettings({
                ...settings,
                organizationSettings: {
                  ...settings.organizationSettings!,
                  industry: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Industry</option>
              <option value="Construction">Construction</option>
              <option value="Technology">Technology</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Legal">Legal</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Retention (Days)</label>
            <input
              type="number"
              value={settings.organizationSettings?.dataRetentionDays || 365}
              onChange={(e) => setSettings({
                ...settings,
                organizationSettings: {
                  ...settings.organizationSettings!,
                  dataRetentionDays: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Users</label>
            <input
              type="number"
              value={settings.organizationSettings?.maxUsers || 50}
              onChange={(e) => setSettings({
                ...settings,
                organizationSettings: {
                  ...settings.organizationSettings!,
                  maxUsers: parseInt(e.target.value)
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Custom Branding</label>
              <p className="text-sm text-gray-600">Enable custom logos and colors</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.organizationSettings?.customBranding || false}
                onChange={(e) => setSettings({
                  ...settings,
                  organizationSettings: {
                    ...settings.organizationSettings!,
                    customBranding: e.target.checked
                  }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">AI Training</label>
              <p className="text-sm text-gray-600">Allow custom AI model training</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.organizationSettings?.aiTrainingEnabled || false}
                onChange={(e) => setSettings({
                  ...settings,
                  organizationSettings: {
                    ...settings.organizationSettings!,
                    aiTrainingEnabled: e.target.checked
                  }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
          <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4 mr-1" />
            Add User
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {organizationUsers.map((orgUser) => (
                <tr key={orgUser.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img className="h-8 w-8 rounded-full" src={orgUser.avatar} alt="" />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{orgUser.name}</div>
                        <div className="text-sm text-gray-500">{orgUser.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      orgUser.role === 'enterprise_admin' 
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {orgUser.role === 'enterprise_admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {orgUser.lastActive.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {orgUser.id !== user.id && (
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security & Access</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Domains</label>
            <div className="space-y-2">
              {settings.organizationSettings?.allowedDomains?.map((domain, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => {
                      const newDomains = [...(settings.organizationSettings?.allowedDomains || [])]
                      newDomains[index] = e.target.value
                      setSettings({
                        ...settings,
                        organizationSettings: {
                          ...settings.organizationSettings!,
                          allowedDomains: newDomains
                        }
                      })
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const newDomains = settings.organizationSettings?.allowedDomains?.filter((_, i) => i !== index) || []
                      setSettings({
                        ...settings,
                        organizationSettings: {
                          ...settings.organizationSettings!,
                          allowedDomains: newDomains
                        }
                      })
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newDomains = [...(settings.organizationSettings?.allowedDomains || []), '']
                  setSettings({
                    ...settings,
                    organizationSettings: {
                      ...settings.organizationSettings!,
                      allowedDomains: newDomains
                    }
                  })
                }}
                className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Domain
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-900">Single Sign-On (SSO)</label>
              <p className="text-sm text-gray-600">Enable SAML/OAuth authentication</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.organizationSettings?.ssoEnabled || false}
                onChange={(e) => setSettings({
                  ...settings,
                  organizationSettings: {
                    ...settings.organizationSettings!,
                    ssoEnabled: e.target.checked
                  }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex space-x-6">
      {/* Sidebar */}
      <div className="w-64 bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-fit">
        <div className="flex items-center space-x-3 mb-6">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h2 className="font-semibold text-gray-900">{user.name}</h2>
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {section.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {activeSection === 'organization' && renderOrganizationSettings()}
        {activeSection === 'users' && renderUserManagement()}
        {activeSection === 'security' && renderSecuritySettings()}
        
        {activeSection === 'ai-models' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Management</h3>
            <p className="text-gray-600">Configure and manage custom AI models for your organization.</p>
            <div className="mt-4 text-sm text-blue-600">
              Feature available in Enterprise AI Training section
            </div>
          </div>
        )}

        {activeSection === 'billing' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing & Subscription</h3>
            {organization && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Current Plan</div>
                  <div className="text-lg font-semibold text-gray-900 capitalize">
                    {organization.subscription.plan}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="text-lg font-semibold text-gray-900 capitalize">
                    {organization.subscription.status}
                  </div>
                </div>
              </div>
            )}
            <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Manage Subscription
            </button>
          </div>
        )}

        {activeSection === 'personal' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AI Personality</label>
                <select
                  value={settings.aiPersonality}
                  onChange={(e) => setSettings({ ...settings, aiPersonality: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
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
    </div>
  )
}