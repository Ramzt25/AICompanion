'use client'

import FloatingChatWidget from '@/components/layout/FloatingChatWidget'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            AI Knowledge Companion
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Your intelligent assistant with contextual awareness, organizational learning, 
            and enterprise-grade knowledge management capabilities.
          </p>
          
          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Contextual Intelligence</h3>
              <p className="text-gray-600 text-sm">
                AI that understands your workflow and provides proactive suggestions based on your current activity.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Knowledge Graph</h3>
              <p className="text-gray-600 text-sm">
                Visualize relationships between entities, projects, and concepts in your organizational knowledge.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Skills Marketplace</h3>
              <p className="text-gray-600 text-sm">
                Extend capabilities with domain-specific skills like OSHA compliance, contract analysis, and more.
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 bg-blue-600 rounded-lg p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Knowledge Management?</h2>
            <p className="text-blue-100 mb-6">
              Start by clicking the AI Assistant in the bottom-right corner to begin exploring your documents with intelligent, contextual support.
            </p>
            <div className="flex justify-center space-x-4 text-sm text-blue-100">
              <span>✓ Instant setup</span>
              <span>✓ No credit card required</span>
              <span>✓ Enterprise-ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </div>
  )
}