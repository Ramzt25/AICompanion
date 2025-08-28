import { NextRequest, NextResponse } from 'next/server'
import { withOptionalAuth } from '@/lib/auth-middleware'
import { generateGroundedAnswer } from '@/lib/rag'
import { withOrgContext } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  message: z.string().min(1),
  org_id: z.string().optional(),
  tools_allowed: z.array(z.string()).optional()
})

export const POST = withOptionalAuth(async (req) => {
  try {
    const body = await req.json()
    const validated = ChatRequestSchema.parse(body)
    
    // Get user context from auth middleware or use demo user
    const userId = req.user?.id || 'f47ac10b-58cc-4372-a567-0e02b2c3d480'
    const orgId = req.user?.orgId || validated.org_id || 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    const { message, tools_allowed } = validated

    // Log the request for audit
    await withOrgContext(orgId, userId, async (client) => {
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
      orgId,
      userId,
      {
        maxChunks: 12,
        includeRecent: message.toLowerCase().includes('latest') || message.toLowerCase().includes('recent'),
        sourceTypes: tools_allowed
      }
    )

    const response = {
      answer: ragResult.answer,
      citations: ragResult.citations,
      tool_calls: [], // No tool calls for basic implementation
      messages: [
        {
          id: uuidv4(),
          role: 'user' as const,
          content: message,
          timestamp: new Date().toISOString()
        },
        {
          id: uuidv4(),
          role: 'assistant' as const,
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
})