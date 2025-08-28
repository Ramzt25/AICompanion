import { NextRequest, NextResponse } from 'next/server'

interface SuggestionRequest {
  url: string
  title?: string
  content?: string
  selection?: string
  context?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestionRequest = await request.json()
    const { url, title, content, selection, context } = body

    // For now, return mock suggestions based on the content
    // In production, this would use OpenAI to generate contextual suggestions
    const suggestions = generateMockSuggestions(url, title, content, selection, context)

    return NextResponse.json({
      success: true,
      suggestions,
      contextAnalysis: {
        pageType: detectPageType(url, title, content),
        confidence: 0.8
      }
    })
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    )
  }
}

function detectPageType(url?: string, title?: string, content?: string): string {
  if (!url && !title && !content) return 'unknown'
  
  const text = `${url} ${title} ${content}`.toLowerCase()
  
  if (text.includes('github') || text.includes('code') || text.includes('repository')) {
    return 'code'
  }
  if (text.includes('documentation') || text.includes('docs') || text.includes('api')) {
    return 'documentation'
  }
  if (text.includes('article') || text.includes('blog') || text.includes('news')) {
    return 'article'
  }
  if (text.includes('tutorial') || text.includes('guide') || text.includes('how to')) {
    return 'tutorial'
  }
  
  return 'general'
}

function generateMockSuggestions(url?: string, title?: string, content?: string, selection?: string, context?: string) {
  const pageType = detectPageType(url, title, content)
  
  const suggestions = {
    code: [
      "🔍 Explain this code",
      "🐛 Find potential bugs",
      "⚡ Suggest optimizations",
      "📚 Add documentation",
      "🧪 Generate unit tests"
    ],
    documentation: [
      "📖 Summarize key points",
      "💡 Provide examples",
      "🔗 Find related topics",
      "❓ Clarify concepts",
      "📝 Create quick notes"
    ],
    article: [
      "📄 Summarize article",
      "🎯 Extract key insights",
      "💭 Get different perspectives",
      "🔗 Find related content",
      "📋 Create action items"
    ],
    tutorial: [
      "📚 Break down steps",
      "🛠️ Suggest practice exercises",
      "❓ Answer questions",
      "🔧 Help with implementation",
      "📈 Track progress"
    ],
    general: [
      "💬 Start a conversation",
      "❓ Ask questions",
      "📝 Take notes",
      "🔍 Learn more about this",
      "💡 Get suggestions"
    ]
  }

  let contextualSuggestions = suggestions[pageType as keyof typeof suggestions] || suggestions.general

  // Add specific suggestions based on selection
  if (selection && selection.trim().length > 0) {
    contextualSuggestions = [
      `💭 Explain: "${selection.substring(0, 30)}${selection.length > 30 ? '...' : ''}"`,
      `🔍 More info about: "${selection.substring(0, 20)}${selection.length > 20 ? '...' : ''}"`,
      ...contextualSuggestions.slice(0, 3)
    ]
  }

  return contextualSuggestions.slice(0, 5)
}
