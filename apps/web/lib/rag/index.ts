import { GROUNDED_PROMPT_TEMPLATE } from '@ai-companion/shared'
import { generateCompletion } from './openai'
import { vectorSearch, rerank, buildCitations } from './retrieval'
import type { Citation } from '@ai-companion/shared'

export interface RAGResponse {
  answer: string
  citations: Citation[]
  retrieved_chunks: number
  confidence: number
}

export async function generateGroundedAnswer(
  query: string,
  orgId: string,
  userId: string,
  options?: {
    maxChunks?: number
    includeRecent?: boolean
    sourceTypes?: string[]
  }
): Promise<RAGResponse> {
  const maxChunks = options?.maxChunks || 12
  
  // Step 1: Retrieve relevant chunks
  const retrievalFilters: any = {}
  
  if (options?.sourceTypes) {
    // For now, just use the first source type
    retrievalFilters.source_type = options.sourceTypes[0]
  }
  
  if (options?.includeRecent) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    retrievalFilters.time_range = {
      start: thirtyDaysAgo,
      end: new Date()
    }
  }

  const prelimResults = await vectorSearch(
    query,
    orgId,
    userId,
    50, // Get more candidates for reranking
    retrievalFilters
  )

  if (prelimResults.length === 0) {
    return {
      answer: "I don't have enough information to answer your question. Please ensure relevant documents are ingested and indexed.",
      citations: [],
      retrieved_chunks: 0,
      confidence: 0
    }
  }

  // Step 2: Rerank for relevance
  const topResults = await rerank(query, prelimResults, maxChunks)
  
  // Step 3: Build context and citations
  const context = topResults
    .map((result, index) => `[${index + 1}] ${result.text}`)
    .join('\n\n')
  
  const citations = buildCitations(topResults)
  const citationsList = citations
    .map((citation, index) => `[${index + 1}] ${citation.title} - ${citation.uri}`)
    .join('\n')

  // Step 4: Generate grounded answer
  const prompt = GROUNDED_PROMPT_TEMPLATE
    .replace('{context}', context)
    .replace('{citations}', citationsList)
    .replace('{question}', query)

  const answer = await generateCompletion(prompt, 0.1)
  
  // Calculate confidence based on retrieval scores and result count
  const avgScore = topResults.reduce((sum, r) => sum + r.score, 0) / topResults.length
  const confidence = Math.min(avgScore * topResults.length * 0.1, 1.0)

  return {
    answer,
    citations,
    retrieved_chunks: topResults.length,
    confidence
  }
}