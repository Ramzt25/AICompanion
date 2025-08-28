import { NextRequest, NextResponse } from 'next/server'

interface ChatRequest {
  message: string
  context?: {
    url?: string
    title?: string
    content?: string
    selection?: string
  }
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  orgId?: string
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, context, history = [], orgId, userId } = body

    // Generate contextual response
    const responseMessage = generateContextualResponse(message, context, history)
    
    const response = {
      id: Date.now().toString(),
      message: responseMessage,
      timestamp: new Date().toISOString(),
      suggestions: generateFollowUpSuggestions(message, context),
      citations: context?.content ? [{
        id: 'page-context',
        title: context.title || 'Current Page Context',
        content: context.content.substring(0, 200) + (context.content.length > 200 ? '...' : ''),
        source: 'webpage',
        url: context.url || request.headers.get('referer') || 'current-page'
      }] : []
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Widget chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

function generateContextualResponse(message: string, context?: any, history?: any[]): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('explain') || lowerMessage.includes('what is')) {
    return `I'd be happy to explain! Based on the context from your current page${context?.title ? ` "${context.title}"` : ''}, let me help you understand this better. 

${context?.selection ? `Regarding "${context.selection.substring(0, 100)}${context.selection.length > 100 ? '...' : ''}"` : 'Looking at the current content'}, this appears to be about ${detectTopic(context)}.

Would you like me to break this down further or provide specific examples?`
  }
  
  if (lowerMessage.includes('summarize') && context?.content) {
    return `Here's a summary based on the current page:

**${context.title || 'Current Page'}**

The main points appear to be about ${detectTopic(context)}. The content covers key concepts and ${context.content.length > 200 ? 'provides detailed information' : 'gives an overview'} on the topic.

Would you like me to dive deeper into any particular aspect?`
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you')) {
    return `I'm your AI Knowledge Companion! I can help you with:

• Answering questions about documents and page content
• Providing contextual assistance based on what you're viewing
• Summarizing information and key insights
• Explaining concepts or code
• Finding related information

${context?.url ? `I can see you're on ${new URL(context.url).hostname}. ` : ''}Try asking me to summarize this page, or ask specific questions about the content you're viewing!`
  }
  
  if (context?.content && (lowerMessage.includes('this page') || lowerMessage.includes('current'))) {
    return `I can see you're asking about the current page. ${context.title ? `This appears to be "${context.title}"` : 'This page'} contains information about ${detectTopic(context)}.

${context.selection ? `I notice you have some text selected. Would you like me to explain that specific part?` : 'What would you like to know more about?'}`
  }
  
  // Default response
  return `I understand you're asking about "${message}". Based on the current page context${context?.title ? ` (${context.title})` : ''}, I'm here to help!

${context?.selection ? 
  `I notice you have some text selected. Would you like me to explain that specific part?` :
  `I can help explain concepts, answer questions, or provide guidance based on what you're viewing.`
}

What would be most helpful for you right now?`
}

function detectTopic(context?: any): string {
  if (!context) return 'the current topic'
  
  const text = `${context.url || ''} ${context.title || ''} ${context.content || ''}`.toLowerCase()
  
  if (text.includes('javascript') || text.includes('js') || text.includes('react') || text.includes('node')) {
    return 'JavaScript development'
  }
  if (text.includes('python') || text.includes('django') || text.includes('flask')) {
    return 'Python programming'
  }
  if (text.includes('api') || text.includes('rest') || text.includes('endpoint')) {
    return 'API development'
  }
  if (text.includes('database') || text.includes('sql') || text.includes('mongodb')) {
    return 'database concepts'
  }
  if (text.includes('css') || text.includes('html') || text.includes('styling')) {
    return 'web styling and markup'
  }
  
  return 'the current topic'
}

function generateFollowUpSuggestions(message: string, context?: any): string[] {
  const suggestions = [
    "Tell me more about this",
    "Show me an example", 
    "What are the best practices?",
    "How do I implement this?",
    "What are common pitfalls?"
  ]
  
  // Add contextual suggestions based on the message
  const msg = message.toLowerCase()
  if (msg.includes('code') || msg.includes('programming') || detectTopic(context).includes('development')) {
    return [
      "Show me example code",
      "Explain the syntax",
      "Find potential issues", 
      "Suggest improvements",
      "Add comments/documentation"
    ]
  }
  
  if (context?.selection) {
    return [
      `Explain "${context.selection.substring(0, 30)}${context.selection.length > 30 ? '...' : ''}"`,
      "More details about this",
      "Related concepts",
      "Practical examples",
      "Next steps"
    ]
  }
  
  return suggestions
}
