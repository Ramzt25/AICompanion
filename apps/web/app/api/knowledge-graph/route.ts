import { NextRequest, NextResponse } from 'next/server'
import { KnowledgeGraph } from '@/lib/knowledge-graph'
import { EntityQuerySchema } from '@ai-companion/shared'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org_id')
    const query = searchParams.get('query')
    const entityTypes = searchParams.get('entity_types')?.split(',')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    if (query) {
      // Search entities
      const entities = await KnowledgeGraph.searchEntities(
        query,
        orgId,
        userId,
        entityTypes,
        limit
      )
      return NextResponse.json({ entities })
    } else {
      // Get entities by type
      const entitiesByType = await KnowledgeGraph.getEntitiesByType(
        orgId,
        userId,
        entityTypes?.[0] as any
      )
      return NextResponse.json({ entities_by_type: entitiesByType })
    }
  } catch (error) {
    console.error('Error getting entities:', error)
    return NextResponse.json(
      { error: 'Failed to get entities' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { org_id, text, document_id } = body

    if (!org_id || !text) {
      return NextResponse.json(
        { error: 'Organization ID and text are required' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    // Extract entities from text
    const entities = await KnowledgeGraph.extractEntities(
      text,
      org_id,
      userId,
      document_id
    )

    // Auto-detect relationships
    const relationships = await KnowledgeGraph.detectRelationships(
      entities,
      org_id,
      userId,
      text
    )

    return NextResponse.json({ 
      entities, 
      relationships,
      message: `Extracted ${entities.length} entities and ${relationships.length} relationships`
    })
  } catch (error) {
    console.error('Error extracting entities:', error)
    return NextResponse.json(
      { error: 'Failed to extract entities' },
      { status: 500 }
    )
  }
}