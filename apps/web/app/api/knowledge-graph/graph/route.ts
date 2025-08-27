import { NextRequest, NextResponse } from 'next/server'
import { KnowledgeGraph } from '@/lib/knowledge-graph'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const entityId = searchParams.get('entity_id')
    const orgId = searchParams.get('org_id')
    const depth = parseInt(searchParams.get('depth') || '2')
    
    if (!entityId || !orgId) {
      return NextResponse.json(
        { error: 'Entity ID and Organization ID are required' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    const graph = await KnowledgeGraph.getEntityGraph(
      entityId,
      orgId,
      userId,
      depth
    )

    return NextResponse.json(graph)
  } catch (error) {
    console.error('Error getting entity graph:', error)
    return NextResponse.json(
      { error: 'Failed to get entity graph' },
      { status: 500 }
    )
  }
}