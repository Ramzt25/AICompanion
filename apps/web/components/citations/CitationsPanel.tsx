'use client'

import { FileText, ExternalLink, Star } from 'lucide-react'
import type { Citation } from '@ai-companion/shared'

interface CitationsPanelProps {
  citations: Citation[]
}

export default function CitationsPanel({ citations }: CitationsPanelProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="font-semibold text-gray-900">Sources & Citations</h2>
        <p className="text-sm text-gray-500">
          {citations.length} source{citations.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Citations List */}
      <div className="flex-1 overflow-y-auto">
        {citations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No citations available</p>
            <p className="text-xs text-gray-400 mt-1">
              Ask a question to see relevant sources
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {citations.map((citation, index) => (
              <div
                key={`${citation.doc_id}-${citation.chunk_id}`}
                className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
              >
                {/* Citation Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h3 className="font-medium text-sm text-gray-900 truncate">
                      {citation.title}
                    </h3>
                  </div>
                  {citation.score && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Star className="h-3 w-3" />
                      <span>{Math.round(citation.score * 100)}%</span>
                    </div>
                  )}
                </div>

                {/* Citation Content */}
                <div className="text-sm text-gray-700 mb-3 line-clamp-3">
                  {citation.span}
                </div>

                {/* Citation Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 truncate max-w-40">
                    {citation.uri}
                  </span>
                  <button 
                    onClick={() => window.open(citation.uri, '_blank')}
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <span>View source</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {citations.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <p className="text-xs text-gray-500 text-center">
            Citations are ranked by relevance and recency
          </p>
        </div>
      )}
    </div>
  )
}