'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, Minimize2, Maximize2, Settings, BarChart3, GitBranch, Zap, Brain, User, LogOut, UserCog, TrendingUp } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { canAccessFeature } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import ChatInterface from '@/components/chat/ChatInterface'
import CitationsPanel from '@/components/citations/CitationsPanel'
import KnowledgeGraphViewer from '@/components/knowledge-graph/KnowledgeGraphViewer'
import SkillsMarketplace from '@/components/skills/SkillsMarketplace'
import TeamAnalytics from '@/components/analytics/TeamAnalytics'
import SubscriptionManager from '@/components/subscription/SubscriptionManager'
import EnterpriseTraining from '@/components/enterprise/EnterpriseTraining'
import IndividualLearningDashboard from '@/components/IndividualLearningDashboard'
import type { Citation } from '@ai-companion/shared'

type WidgetState = 'minimized' | 'chat' | 'expanded'
type ActiveTab = 'chat' | 'knowledge-graph' | 'skills' | 'analytics' | 'subscription' | 'training' | 'individual-learning' | 'sources' | 'automations' | 'settings'

export default function FloatingChatWidget() {
  const { user, logout, switchUser } = useAuth()
  const router = useRouter()
  const [widgetState, setWidgetState] = useState<WidgetState>('minimized')
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat')
  const [selectedCitations, setSelectedCitations] = useState<Citation[]>([])
  const [isVisible, setIsVisible] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const orgId = user?.organizationId || 'demo-org-id'

  // Auto-hide logic - hide widget after 30 seconds of inactivity if minimized
  useEffect(() => {
    if (widgetState === 'minimized') {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 30000)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(true)
    }
  }, [widgetState])

  if (!user) {
    return null
  }

  const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: MessageCircle, available: true },
    { id: 'knowledge-graph' as const, label: 'Knowledge', icon: GitBranch, available: true },
    { id: 'skills' as const, label: 'Skills', icon: Zap, available: canAccessFeature(user, 'custom-skills') },
    { id: 'individual-learning' as const, label: 'My Learning', icon: TrendingUp, available: true },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3, available: canAccessFeature(user, 'team-analytics') },
    { id: 'training' as const, label: 'Training', icon: Brain, available: canAccessFeature(user, 'ai-training') },
    { id: 'subscription' as const, label: 'Plan', icon: Settings, available: true },
  ].filter(tab => tab.available)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleSettingsClick = () => {
    router.push('/settings')
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface onCitationsUpdate={setSelectedCitations} />
      case 'knowledge-graph':
        return <KnowledgeGraphViewer orgId={orgId} />
      case 'skills':
        return <SkillsMarketplace orgId={orgId} />
      case 'individual-learning':
        return <IndividualLearningDashboard />
      case 'analytics':
        return <TeamAnalytics orgId={orgId} />
      case 'training':
        return <EnterpriseTraining orgId={orgId} />
      case 'subscription':
        return <SubscriptionManager orgId={orgId} />
      case 'sources':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Sources</h2>
            <p className="text-gray-600">Source management interface would be implemented here.</p>
          </div>
        )
      case 'automations':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Automations</h2>
            <p className="text-gray-600">Automation management interface would be implemented here.</p>
          </div>
        )
      case 'settings':
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">Settings interface would be implemented here.</p>
          </div>
        )
      default:
        return <ChatInterface onCitationsUpdate={setSelectedCitations} />
    }
  }

  if (!isVisible && widgetState === 'minimized') {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 w-3 h-3 bg-blue-600 rounded-full animate-pulse hover:bg-blue-700 transition-colors z-50"
        title="Show AI Assistant"
      />
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Minimized State */}
      {widgetState === 'minimized' && (
        <div className="bg-white rounded-full shadow-lg border border-gray-200 p-4 hover:shadow-xl transition-shadow">
          <button
            onClick={() => setWidgetState('chat')}
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="ml-2 font-medium">AI Assistant</span>
          </button>
        </div>
      )}

      {/* Chat State */}
      {widgetState === 'chat' && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 h-96 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-6 h-6 rounded-full"
              />
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">AI Knowledge Companion</h3>
                <p className="text-xs text-gray-600">Ask questions about your documents and get cited answers</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setWidgetState('expanded')}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setWidgetState('minimized')}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 p-4">
              <div className="text-center text-gray-500 text-sm mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Welcome to AI Knowledge Companion</h4>
                <p className="mb-3">Try asking questions like:</p>
                <div className="space-y-2 text-xs">
                  <button className="block w-full p-2 bg-gray-50 hover:bg-gray-100 rounded text-left transition-colors">
                    "What changed in the Lighting Plan REV B?"
                  </button>
                  <button className="block w-full p-2 bg-gray-50 hover:bg-gray-100 rounded text-left transition-colors">
                    "Summarize the electrical specification requirements"
                  </button>
                  <button className="block w-full p-2 bg-gray-50 hover:bg-gray-100 rounded text-left transition-colors">
                    "What are the key safety protocols?"
                  </button>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Ask a question about your documents..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded State */}
      {widgetState === 'expanded' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <h2 className="font-semibold text-gray-900">AI Knowledge Companion</h2>
                  <p className="text-sm text-gray-600">{user.name} • {user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>{user.name}</span>
                  </button>
                  
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-600">{user.email}</p>
                        {user.organizationName && (
                          <p className="text-xs text-gray-500">{user.organizationName}</p>
                        )}
                      </div>
                      
                      <button
                        onClick={handleSettingsClick}
                        className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <UserCog className="w-4 h-4 mr-2" />
                        Settings
                      </button>
                      
                      {/* Demo: Quick User Switch */}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <div className="px-3 py-1 text-xs text-gray-500 font-medium">Demo: Switch User</div>
                        <button
                          onClick={() => switchUser('user-personal-1')}
                          className="w-full flex items-center px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          Personal User
                        </button>
                        <button
                          onClick={() => switchUser('user-enterprise-1')}
                          className="w-full flex items-center px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          Enterprise User
                        </button>
                        <button
                          onClick={() => switchUser('user-admin-1')}
                          className="w-full flex items-center px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          Enterprise Admin
                        </button>
                      </div>
                      
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setWidgetState('chat')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Minimize to chat"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setWidgetState('minimized')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {renderTabContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}