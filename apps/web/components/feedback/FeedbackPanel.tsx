'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, MessageSquare, Star, AlertTriangle } from 'lucide-react'
import type { Citation, FeedbackRequest } from '@ai-companion/shared'

interface FeedbackPanelProps {
  question: string
  answer: string
  citations: Citation[]
  orgId: string
  onFeedbackSubmitted: (feedback: any) => void
}

export default function FeedbackPanel({
  question,
  answer,
  citations,
  orgId,
  onFeedbackSubmitted
}: FeedbackPanelProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackRequest['feedback_type'] | null>(null)
  const [feedbackDetails, setFeedbackDetails] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const submitFeedback = async () => {
    if (!feedbackType) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/feedback?org_id=${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          answer,
          citations,
          feedback_type: feedbackType,
          feedback_details: feedbackDetails.trim() || undefined
        })
      })

      const data = await response.json()
      onFeedbackSubmitted(data.feedback)
      
      // Reset form
      setFeedbackType(null)
      setFeedbackDetails('')
      setShowDetails(false)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const feedbackOptions = [
    { 
      type: 'good' as const, 
      icon: ThumbsUp, 
      label: 'Good answer',
      color: 'text-green-600 hover:bg-green-50 border-green-200'
    },
    { 
      type: 'helpful' as const, 
      icon: Star, 
      label: 'Helpful',
      color: 'text-blue-600 hover:bg-blue-50 border-blue-200'
    },
    { 
      type: 'irrelevant' as const, 
      icon: AlertTriangle, 
      label: 'Irrelevant',
      color: 'text-yellow-600 hover:bg-yellow-50 border-yellow-200'
    },
    { 
      type: 'bad' as const, 
      icon: ThumbsDown, 
      label: 'Poor answer',
      color: 'text-red-600 hover:bg-red-50 border-red-200'
    }
  ]

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 flex items-center">
          <MessageSquare className="w-4 h-4 mr-2" />
          How was this answer?
        </h4>
        {feedbackType && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showDetails ? 'Hide details' : 'Add details'}
          </button>
        )}
      </div>

      {/* Feedback Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {feedbackOptions.map((option) => {
          const Icon = option.icon
          const isSelected = feedbackType === option.type
          
          return (
            <button
              key={option.type}
              onClick={() => setFeedbackType(option.type)}
              className={`
                flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all
                ${isSelected 
                  ? `${option.color} bg-opacity-50 border-opacity-50` 
                  : 'text-gray-600 hover:bg-gray-100 border-gray-200'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{option.label}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback Details */}
      {showDetails && feedbackType && (
        <div className="mb-3">
          <textarea
            value={feedbackDetails}
            onChange={(e) => setFeedbackDetails(e.target.value)}
            placeholder={`Tell us more about why this answer was ${feedbackType}...`}
            className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>
      )}

      {/* Submit Button */}
      {feedbackType && (
        <div className="flex justify-end">
          <button
            onClick={submitFeedback}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      )}

      {/* Success State */}
      {!feedbackType && !submitting && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-500">
            Your feedback helps improve AI responses for your organization
          </p>
        </div>
      )}
    </div>
  )
}