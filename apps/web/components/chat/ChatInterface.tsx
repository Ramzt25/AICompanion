'use client'

import { useState } from 'react'
import { Send, Loader2, Brain, User } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import type { ChatResponse, Citation, ContextualSuggestion } from '@ai-companion/shared'
import ContextualCopilot from '@/components/contextual/ContextualCopilot'
import FeedbackPanel from '@/components/feedback/FeedbackPanel'
import { Badge } from '@/components/ui/badge'

interface ChatInterfaceProps {
  onCitationsUpdate: (citations: Citation[]) => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  confidence?: number
  citations?: Citation[]
  personalizedContext?: string[]
  responseStyle?: string
  detailLevel?: string
}

export default function ChatInterface({ onCitationsUpdate }: ChatInterfaceProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showFeedback, setShowFeedback] = useState<string | null>(null)
  const [personalizedConfig, setPersonalizedConfig] = useState<any>(null)

  const orgId = user?.organizationId || 'demo-org-id'

  const handleSuggestionClick = (suggestion: ContextualSuggestion) => {
    if (suggestion.context_data?.suggested_query) {
      setInput(suggestion.context_data.suggested_query)
    }
  }

  const handleFeedbackSubmitted = (feedback: any) => {
    console.log('Feedback submitted:', feedback)
    setShowFeedback(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !user) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // TODO: Implement personalized response API endpoint
      const personalizedResponse = {
        style_preferences: 'technical',
        complexity_level: 'intermediate',
        response_format: 'detailed',
        personalizedContext: ['Based on your role and previous interactions'],
        style: 'technical',
        detailLevel: 'comprehensive'
      }
      setPersonalizedConfig(personalizedResponse)

      // Simulate enhanced response with personalization
      const enhancedResponse = await generatePersonalizedResponse(
        input.trim(),
        personalizedResponse,
        user
      )
      
      const assistantMessage: Message = {
        id: Date.now().toString() + '_assistant',
        role: 'assistant',
        content: enhancedResponse.content,
        timestamp: new Date().toISOString(),
        confidence: 0.85,
        citations: enhancedResponse.citations,
        personalizedContext: personalizedResponse.personalizedContext,
        responseStyle: personalizedResponse.style,
        detailLevel: personalizedResponse.detailLevel
      }

      setMessages(prev => [...prev, assistantMessage])
      onCitationsUpdate(enhancedResponse.citations)

      // TODO: Implement API endpoint to record user interaction
      console.log('Recording interaction:', {
        userId: user.id,
        orgId,
        query: input.trim(),
        response: enhancedResponse.content
      })

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Generate personalized response based on user's learning profile
  const generatePersonalizedResponse = async (query: string, config: any, user: any) => {
    // This would integrate with your actual LLM/RAG pipeline
    // For demo purposes, we'll generate a response that shows personalization
    
    const baseResponse = getBaseResponse(query)
    const personalizedContent = applyPersonalization(baseResponse, config, user)
    
    return {
      content: personalizedContent,
      citations: generateSampleCitations(),
      confidence: 0.85
    }
  }

  const getBaseResponse = (query: string): string => {
    if (query.toLowerCase().includes('safety')) {
      return "Safety protocols are critical in construction projects. The key requirements include personal protective equipment (PPE), site inspection procedures, and emergency response protocols."
    }
    if (query.toLowerCase().includes('project')) {
      return "Project management involves coordinating resources, timelines, and stakeholder communication to ensure successful completion within scope and budget."
    }
    return "Based on the available documentation, here's what I found relevant to your question..."
  }

  const applyPersonalization = (baseResponse: string, config: any, user: any): string => {
    let personalizedResponse = baseResponse

    // Add role-specific context
    if (user.role === 'enterprise_admin') {
      personalizedResponse += "\n\n**For Administrators:** Consider how this impacts organizational policies and compliance requirements."
    } else if (user.role === 'enterprise_user') {
      personalizedResponse += "\n\n**Team Context:** This information aligns with your department's current initiatives."
    }

    // Add expertise-aware content
    if (config.personalizedContext?.includes('safety')) {
      personalizedResponse += "\n\n*Given your expertise in safety protocols, you might also want to consider the latest OSHA updates in this area.*"
    }

    // Adjust detail level
    if (config.detailLevel === 'brief') {
      personalizedResponse = personalizedResponse.split('.')[0] + '. Contact me for more details.'
    } else if (config.detailLevel === 'comprehensive') {
      personalizedResponse += "\n\n**Additional Context:** This connects to previous discussions about workflow optimization and ties into the broader organizational strategy."
    }

    // Add response style adaptation
    if (config.style === 'technical') {
      personalizedResponse += "\n\n*Technical Note: Implementation requires consideration of system architecture and integration points.*"
    } else if (config.style === 'step-by-step') {
      personalizedResponse = convertToStepByStep(personalizedResponse)
    }

    return personalizedResponse
  }

  const convertToStepByStep = (content: string): string => {
    const sentences = content.split('. ')
    return sentences.map((sentence, index) => `${index + 1}. ${sentence.trim()}`).join('\n')
  }

  const generateSampleCitations = (): Citation[] => {
    return [
      {
        doc_id: 'doc-1',
        chunk_id: 'chunk-1',
        title: 'Safety Protocols Manual',
        content: 'Safety protocols must be followed at all times...',
        score: 0.89,
        page: 12
      },
      {
        doc_id: 'doc-2', 
        chunk_id: 'chunk-2',
        title: 'Project Management Guidelines',
        content: 'Effective project management requires...',
        score: 0.76,
        page: 8
      }
    ]
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">AI Knowledge Companion</h1>
        <p className="text-sm text-gray-500">Ask questions about your documents and get cited answers</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Contextual Copilot */}
        <ContextualCopilot 
          orgId={orgId}
          currentPage="chat"
          onSuggestionClick={handleSuggestionClick}
        />

        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <h3 className="text-lg font-medium mb-2">Welcome to AI Knowledge Companion</h3>
            <p className="text-sm">Try asking questions like:</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100" 
                  onClick={() => setInput("What changed in the Lighting Plan REV B?")}
              >
                "What changed in the Lighting Plan REV B?"
              </li>
              <li className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => setInput("Summarize the electrical specification requirements")}
              >
                "Summarize the electrical specification requirements"
              </li>
              <li className="bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100"
                  onClick={() => setInput("What are the key safety protocols?")}
              >
                "What are the key safety protocols?"
              </li>
            </ul>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {message.role === 'assistant' && message.confidence && (
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Confidence: {Math.round(message.confidence * 100)}%</span>
                    <div className="flex items-center space-x-2">
                      {message.citations && (
                        <span>{message.citations.length} citations</span>
                      )}
                      <button
                        onClick={() => setShowFeedback(showFeedback === message.id ? null : message.id)}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Rate answer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Feedback Panel */}
            {message.role === 'assistant' && showFeedback === message.id && (
              <div className="max-w-3xl">
                <FeedbackPanel
                  question={messages.find(m => m.timestamp < message.timestamp && m.role === 'user')?.content || ''}
                  answer={message.content}
                  citations={message.citations || []}
                  orgId={orgId}
                  onFeedbackSubmitted={handleFeedbackSubmitted}
                />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}