'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, Minimize2, Maximize2, Settings, BarChart3, GitBranch, Zap, Brain } from 'lucide-react'
import ChatInterface from '@/components/chat/ChatInterface'
import CitationsPanel from '@/components/citations/CitationsPanel'
import KnowledgeGraphViewer from '@/components/knowledge-graph/KnowledgeGraphViewer'
import SkillsMarketplace from '@/components/skills/SkillsMarketplace'
import TeamAnalytics from '@/components/analytics/TeamAnalytics'
import SubscriptionManager from '@/components/subscription/SubscriptionManager'
import EnterpriseTraining from '@/components/enterprise/EnterpriseTraining'
import type { Citation } from '@ai-companion/shared'

type WidgetState = 'minimized' | 'chat' | 'expanded'
type ActiveTab = 'chat' | 'knowledge-graph' | 'skills' | 'analytics' | 'subscription' | 'training' | 'sources' | 'automations' | 'settings'

export default function FloatingChatWidget() {
  const [widgetState, setWidgetState] = useState<WidgetState>('minimized')
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat')
  const [selectedCitations, setSelectedCitations] = useState<Citation[]>([])
  const [isVisible, setIsVisible] = useState(true)

  const orgId = 'demo-org-id'

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

  const tabs = [
    { id: 'chat' as const, label: 'Chat', icon: MessageCircle },
    { id: 'knowledge-graph' as const, label: 'Knowledge', icon: GitBranch },
    { id: 'skills' as const, label: 'Skills', icon: Zap },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'training' as const, label: 'Training', icon: Brain },
    { id: 'subscription' as const, label: 'Plan', icon: Settings },
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <ChatInterface onCitationsUpdate={setSelectedCitations} />
      case 'knowledge-graph':
        return <KnowledgeGraphViewer orgId={orgId} />
      case 'skills':
        return <SkillsMarketplace orgId={orgId} />
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
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="hidden sm:inline text-sm font-medium">AI Assistant</span>
          </button>
        </div>
      )}

      {/* Chat State */}
      {widgetState === 'chat' && (
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80 h-96 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">AI Assistant</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setWidgetState('expanded')}
                className="p-1 hover:bg-blue-700 rounded"
                title="Expand"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setWidgetState('minimized')}
                className="p-1 hover:bg-blue-700 rounded"
                title="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface onCitationsUpdate={setSelectedCitations} />
          </div>
        </div>
      )}

      {/* Expanded State */}
      {widgetState === 'expanded' && (
        <div className="fixed inset-4 bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-6 w-6" />
              <span className="font-semibold text-lg">AI Knowledge Companion</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setWidgetState('chat')}
                className="p-2 hover:bg-blue-700 rounded"
                title="Minimize to chat"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setWidgetState('minimized')}
                className="p-2 hover:bg-blue-700 rounded"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
              {renderTabContent()}
            </div>

            {/* Citations Panel - Only show for chat */}
            {activeTab === 'chat' && selectedCitations.length > 0 && (
              <div className="w-80 border-l border-gray-200 overflow-hidden">
                <CitationsPanel citations={selectedCitations} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}