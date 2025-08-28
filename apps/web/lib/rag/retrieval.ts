import { withOrgContext } from '../db'
import { cosineSimilarity } from '../embeddings'

export interface ChunkResult {
  id: string
  text: string
  score: number
  document_id: string
  document_title: string
  document_uri: string
  source_type: string
  meta_json: any
}

export interface Citation {
  source: string
  title: string
  url?: string
  snippet: string
}

export async function vectorSearch(
  query: string,
  queryEmbedding: number[],
  orgId: string,
  limit: number = 50,
  options?: {
    includeRecent?: boolean
    sourceTypes?: string[]
  }
): Promise<ChunkResult[]> {
  
  return withOrgContext(orgId, '', async (client) => {
    let sql = `
      SELECT 
        c.id,
        c.document_id,
        c.text,
        c.meta_json,
        d.uri as document_uri,
        d.title as document_title,
        s.type as source_type,
        1 - (c.embedding <=> $1::vector) as score
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE c.embedding IS NOT NULL
    `
    
    const params: any[] = [`[${queryEmbedding.join(',')}]`]
    let paramIndex = 2

    if (options?.sourceTypes && options.sourceTypes.length > 0) {
      sql += ` AND s.type = ANY($${paramIndex})`
      params.push(options.sourceTypes)
      paramIndex++
    }

    if (options?.includeRecent) {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      sql += ` AND d.created_at >= $${paramIndex}`
      params.push(thirtyDaysAgo)
      paramIndex++
    }

    sql += ` ORDER BY score DESC LIMIT $${paramIndex}`
    params.push(limit)

    try {
      const result = await client.query(sql, params)
      return result.rows.map((row: any) => ({
        id: row.id,
        text: row.text,
        score: parseFloat(row.score),
        document_id: row.document_id,
        document_title: row.document_title,
        document_uri: row.document_uri,
        source_type: row.source_type,
        meta_json: row.meta_json
      }))
    } catch (error) {
      console.error('Vector search error:', error)
      // Return empty results if search fails
      return []
    }
  })
}

/**
 * Rerank search results using semantic similarity
 */
export async function rerank(
  query: string, 
  chunks: ChunkResult[], 
  topK: number
): Promise<ChunkResult[]> {
  try {
    // For now, just return the top results
    // In production, this could use a reranking model
    return chunks.slice(0, topK)
  } catch (error) {
    console.error('Reranking error:', error)
    return chunks.slice(0, topK)
  }
}

/**
 * Build citations from chunks
 */
export function buildCitations(chunks: ChunkResult[]): Citation[] {
  const citationMap = new Map<string, Citation>()
  
  chunks.forEach(chunk => {
    const key = chunk.document_id
    if (!citationMap.has(key)) {
      citationMap.set(key, {
        source: chunk.source_type,
        title: chunk.document_title,
        url: chunk.document_uri,
        snippet: chunk.text.substring(0, 200) + '...'
      })
    }
  })
  
  return Array.from(citationMap.values())
}
