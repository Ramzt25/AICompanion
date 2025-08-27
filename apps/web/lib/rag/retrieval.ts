import { withOrgContext } from '../db'
import { generateEmbedding } from './openai'
import type { Citation } from '@ai-companion/shared'

export interface RetrievalResult {
  id: string
  document_id: string
  text: string
  score: number
  uri: string
  title: string
  meta_json: any
}

export async function vectorSearch(
  query: string,
  orgId: string,
  userId: string,
  limit: number = 50,
  filters?: {
    source_type?: string
    time_range?: { start: Date; end: Date }
  }
): Promise<RetrievalResult[]> {
  const queryEmbedding = await generateEmbedding(query)
  
  return withOrgContext(orgId, userId, async (client) => {
    let sql = `
      SELECT 
        c.id,
        c.document_id,
        c.text,
        c.meta_json,
        d.uri,
        d.title,
        1 - (c.embedding <=> $1::vector) as score
      FROM chunks c
      JOIN documents d ON d.id = c.document_id
      JOIN sources s ON s.id = d.source_id
      WHERE c.embedding IS NOT NULL
    `
    
    const params: any[] = [JSON.stringify(queryEmbedding)]
    let paramIndex = 2

    if (filters?.source_type) {
      sql += ` AND s.type = $${paramIndex}`
      params.push(filters.source_type)
      paramIndex++
    }

    if (filters?.time_range) {
      sql += ` AND d.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`
      params.push(filters.time_range.start, filters.time_range.end)
      paramIndex += 2
    }

    sql += ` ORDER BY c.embedding <=> $1::vector LIMIT $${paramIndex}`
    params.push(limit)

    const result = await client.query(sql, params)
    return result.rows
  })
}

export async function rerank(
  query: string,
  results: RetrievalResult[],
  topK: number = 12
): Promise<RetrievalResult[]> {
  // Simple re-ranking based on text similarity and metadata
  // In production, you'd use a cross-encoder model like bge-reranker
  
  const queryWords = query.toLowerCase().split(/\s+/)
  
  const reranked = results.map(result => {
    let score = result.score
    
    // Boost based on title match
    const titleWords = result.title.toLowerCase().split(/\s+/)
    const titleMatches = queryWords.filter(word => 
      titleWords.some(titleWord => titleWord.includes(word) || word.includes(titleWord))
    ).length
    score += titleMatches * 0.1
    
    // Boost based on text relevance
    const textWords = result.text.toLowerCase().split(/\s+/)
    const textMatches = queryWords.filter(word =>
      textWords.some(textWord => textWord.includes(word) || word.includes(textWord))
    ).length
    score += textMatches * 0.05
    
    // Boost recent documents
    const docAge = Date.now() - new Date(result.meta_json?.last_modified || 0).getTime()
    const daysSinceModified = docAge / (1000 * 60 * 60 * 24)
    if (daysSinceModified < 30) {
      score += 0.1 * (30 - daysSinceModified) / 30
    }
    
    return { ...result, score }
  })
  
  return reranked
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

export function buildCitations(results: RetrievalResult[]): Citation[] {
  return results.map((result, index) => ({
    doc_id: result.document_id,
    chunk_id: result.id,
    uri: result.uri,
    title: result.title,
    span: result.text.substring(0, 100) + '...',
    score: result.score
  }))
}