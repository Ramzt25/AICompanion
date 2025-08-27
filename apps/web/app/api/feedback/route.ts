import { NextRequest, NextResponse } from 'next/server'
import { FeedbackLearningSystem } from '@/lib/feedback-learning'
import { FeedbackRequestSchema } from '@ai-companion/shared'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = FeedbackRequestSchema.parse(body)
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org_id')
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    const feedback = await FeedbackLearningSystem.recordFeedback(
      userId,
      orgId,
      validated.question,
      validated.answer,
      validated.citations,
      validated.feedback_type,
      validated.feedback_details
    )

    return NextResponse.json({ 
      feedback,
      message: 'Feedback recorded successfully'
    })
  } catch (error) {
    console.error('Error recording feedback:', error)
    return NextResponse.json(
      { error: 'Failed to record feedback' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org_id')
    const action = searchParams.get('action')
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    switch (action) {
      case 'knowledge_gaps':
        const timeframe = (searchParams.get('timeframe') as 'week' | 'month' | 'quarter') || 'month'
        const gaps = await FeedbackLearningSystem.getKnowledgeGaps(orgId, userId, timeframe)
        return NextResponse.json({ knowledge_gaps: gaps })

      case 'improvement_suggestions':
        const suggestions = await FeedbackLearningSystem.getImprovementSuggestions(orgId, userId)
        return NextResponse.json({ suggestions })

      case 'similar_questions':
        const question = searchParams.get('question')
        if (!question) {
          return NextResponse.json(
            { error: 'Question is required for similar questions search' },
            { status: 400 }
          )
        }
        const similar = await FeedbackLearningSystem.getSimilarQuestions(question, orgId, userId)
        return NextResponse.json({ similar_questions: similar })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: knowledge_gaps, improvement_suggestions, or similar_questions' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error getting feedback data:', error)
    return NextResponse.json(
      { error: 'Failed to get feedback data' },
      { status: 500 }
    )
  }
}