import { NextRequest, NextResponse } from 'next/server'
import { ChatRequestSchema, type ChatResponse } from '@ai-companion/shared'
import { generateGroundedAnswer } from '@/lib/rag'
import { withOrgContext } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = ChatRequestSchema.parse(body)
    
    // For demo, we'll use hardcoded user context
    // In production, this would come from authentication
    const userId = 'demo-user-id'
    const { message, org_id, tools_allowed } = validated

    // Log the request for audit
    await withOrgContext(org_id, userId, async (client) => {
      await client.query(`
        INSERT INTO audit (actor_id, action, target, result, meta_json)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        userId,
        'chat_request',
        'rag_query',
        'success',
        { message: message.substring(0, 100), tools_allowed }
      ])
    })

    // Generate RAG response
    const ragResult = await generateGroundedAnswer(
      message,
      org_id,
      userId,
      {
        maxChunks: 12,
        includeRecent: message.toLowerCase().includes('latest') || message.toLowerCase().includes('recent'),
        sourceTypes: tools_allowed
      }
    )

    const response: ChatResponse = {
      answer: ragResult.answer,
      citations: ragResult.citations,
      tool_calls: [], // No tool calls for basic implementation
      messages: [
        {
          id: uuidv4(),
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: ragResult.answer,
          timestamp: new Date().toISOString(),
          confidence: ragResult.confidence,
          retrieved_chunks: ragResult.retrieved_chunks
        }
      ]
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Chat API error:', error)
    
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}