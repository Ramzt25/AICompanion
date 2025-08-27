'use client'

import { useState } from 'react'
import ChatInterface from '@/components/chat/ChatInterface'
import CitationsPanel from '@/components/citations/CitationsPanel'
import Sidebar from '@/components/layout/Sidebar'
import KnowledgeGraphViewer from '@/components/knowledge-graph/KnowledgeGraphViewer'
import SkillsMarketplace from '@/components/skills/SkillsMarketplace'
import TeamAnalytics from '@/components/analytics/TeamAnalytics'
import SubscriptionManager from '@/components/subscription/SubscriptionManager'
import type { Citation } from '@ai-companion/shared'

export default function HomePage() {
  const [selectedCitations, setSelectedCitations] = useState<Citation[]>([])
  const [activeSection, setActiveSection] = useState('chat')

  const orgId = 'demo-org-id'

  const renderMainContent = () => {
    switch (activeSection) {
      case 'chat':
        return <ChatInterface onCitationsUpdate={setSelectedCitations} />
      case 'knowledge-graph':
        return <KnowledgeGraphViewer orgId={orgId} />
      case 'skills':
        return <SkillsMarketplace orgId={orgId} />
      case 'analytics':
        return <TeamAnalytics orgId={orgId} />
      case 'subscription':
        return <SubscriptionManager orgId={orgId} />
      case 'sources':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Sources</h2>
            <p className="text-gray-600">Source management interface would be implemented here.</p>
          </div>
        )
      case 'automations':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Automations</h2>
            <p className="text-gray-600">Automation management interface would be implemented here.</p>
          </div>
        )
      case 'memories':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Organizational Memory</h2>
            <p className="text-gray-600">Memory management interface would be implemented here.</p>
          </div>
        )
      case 'settings':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">Settings interface would be implemented here.</p>
          </div>
        )
      default:
        return <ChatInterface onCitationsUpdate={setSelectedCitations} />
    }
  }

  return (
    <>
      {/* Sidebar */}
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Main Area */}
        <div className="flex-1 flex flex-col">
          {renderMainContent()}
        </div>
        
        {/* Citations Panel - Only show for chat */}
        {activeSection === 'chat' && (
          <div className="w-96 border-l border-gray-200">
            <CitationsPanel citations={selectedCitations} />
          </div>
        )}
      </div>
    </>
  )
}