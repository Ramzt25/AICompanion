'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, Zap, FileText, Bot, ArrowRight } from 'lucide-react'
import type { ContextualSuggestion } from '@ai-companion/shared'

interface ContextualCopilotProps {
  orgId: string
  currentPage: 'chat' | 'sources' | 'automations' | 'memory' | 'analytics'
  onSuggestionClick: (suggestion: ContextualSuggestion) => void
}

export default function ContextualCopilot({ 
  orgId, 
  currentPage, 
  onSuggestionClick 
}: ContextualCopilotProps) {
  const [suggestions, setSuggestions] = useState<ContextualSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Update context when page changes
    updateContext()
    // Fetch suggestions
    fetchSuggestions()
  }, [currentPage, orgId])

  const updateContext = async () => {
    try {
      await fetch('/api/contextual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          page_type: currentPage,
          context_data: {
            page: currentPage,
            timestamp: new Date().toISOString()
          }
        })
      })
    } catch (error) {
      console.error('Failed to update context:', error)
    }
  }

  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/contextual?org_id=${orgId}`)
      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Failed to fetch suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSuggestionIcon = (type: ContextualSuggestion['type']) => {
    switch (type) {
      case 'action': return <Zap className="w-4 h-4" />
      case 'query': return <Bot className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      case 'automation': return <ArrowRight className="w-4 h-4" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-blue-600 animate-pulse" />
          <span className="text-sm font-medium text-blue-800">
            Getting contextual suggestions...
          </span>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <Lightbulb className="w-5 h-5 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-800">
          AI Copilot Suggestions
        </h3>
        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
          {currentPage}
        </span>
      </div>

      <div className="space-y-2">
        {suggestions.slice(0, 3).map((suggestion, index) => (
          <div
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            className="bg-white rounded-md p-3 border border-blue-100 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 text-blue-600 mt-0.5">
                {getSuggestionIcon(suggestion.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-800">
                    {suggestion.title}
                  </p>
                  <div className="flex items-center space-x-1">
                    <span className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}>
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {suggestion.description}
                </p>
                {suggestion.context_data?.suggested_query && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 italic">
                    "{suggestion.context_data.suggested_query.substring(0, 100)}..."
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {suggestions.length > 3 && (
        <button
          onClick={fetchSuggestions}
          className="mt-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Show {suggestions.length - 3} more suggestions
        </button>
      )}
    </div>
  )
}