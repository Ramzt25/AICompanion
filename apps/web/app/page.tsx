'use client'

import { useState } from 'react'
import ChatInterface from '@/components/chat/ChatInterface'
import CitationsPanel from '@/components/citations/CitationsPanel'
import Sidebar from '@/components/layout/Sidebar'
import type { Citation } from '@ai-companion/shared'

export default function HomePage() {
  const [selectedCitations, setSelectedCitations] = useState<Citation[]>([])

  return (
    <>
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          <ChatInterface onCitationsUpdate={setSelectedCitations} />
        </div>
        
        {/* Citations Panel */}
        <div className="w-96 border-l border-gray-200">
          <CitationsPanel citations={selectedCitations} />
        </div>
      </div>
    </>
  )
}