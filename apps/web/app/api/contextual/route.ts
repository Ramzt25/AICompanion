import { NextRequest, NextResponse } from 'next/server'
import { ContextualCopilot } from '@/lib/contextual-copilot'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org_id')
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // For demo, use hardcoded user ID
    // In production, this would come from authentication
    const userId = 'demo-user-id'

    const suggestions = await ContextualCopilot.getSuggestions(userId, orgId)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error getting contextual suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { org_id, page_type, context_data } = body

    if (!org_id || !page_type) {
      return NextResponse.json(
        { error: 'Organization ID and page type are required' },
        { status: 400 }
      )
    }

    // For demo, use hardcoded user ID
    const userId = 'demo-user-id'

    await ContextualCopilot.updateContext(
      userId,
      org_id,
      page_type,
      context_data || {}
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating context:', error)
    return NextResponse.json(
      { error: 'Failed to update context' },
      { status: 500 }
    )
  }
}