import { generateCompletion } from './openai'
import { vectorSearch, rerank, buildCitations, type ChunkResult, type Citation } from './retrieval'
import { generateEmbedding } from '../embeddings'

export interface RAGResponse {
  answer: string
  citations: Citation[]
  retrieved_chunks: number
  confidence: number
}

// Simple prompt template since we don't have the shared package yet
const GROUNDED_PROMPT_TEMPLATE = `You are a helpful AI assistant that answers questions based on the provided context. Always base your answers on the given information and cite your sources.

Context:
{context}

Question: {query}

Instructions:
- Answer based only on the provided context
- If the context doesn't contain enough information, say so
- Be specific and accurate
- Keep your response concise but complete

Answer:`

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
  
  try {
    // Step 1: Generate query embedding
    const queryEmbedding = await generateEmbedding(query)
    
    // Step 2: Retrieve relevant chunks from database
    const chunks = await vectorSearch(
      query,
      queryEmbedding,
      orgId,
      maxChunks * 2, // Get more candidates for reranking
      options
    )

    if (chunks.length === 0) {
      return {
        answer: "I don't have enough information in my knowledge base to answer that question. Please provide more context or check if the relevant documents have been uploaded.",
        citations: [],
        retrieved_chunks: 0,
        confidence: 0
      }
    }

    // Step 3: Rerank chunks for relevance
    const rerankedChunks = await rerank(query, chunks, maxChunks)
    
    // Step 4: Build context from top chunks
    const context = rerankedChunks
      .map(chunk => `[${chunk.document_title || 'Document'}] ${chunk.text}`)
      .join('\n\n')
    
    // Step 5: Generate answer using LLM
    const prompt = GROUNDED_PROMPT_TEMPLATE
      .replace('{query}', query)
      .replace('{context}', context)
    
    const answer = await generateCompletion(prompt)
    
    // Step 6: Build citations
    const citations = buildCitations(rerankedChunks)
    
    // Step 7: Calculate confidence based on chunk scores and count
    const avgScore = rerankedChunks.reduce((sum, chunk) => sum + chunk.score, 0) / rerankedChunks.length
    const confidence = Math.min(avgScore * 0.8 + (rerankedChunks.length / maxChunks) * 0.2, 1)
    
    return {
      answer,
      citations,
      retrieved_chunks: rerankedChunks.length,
      confidence
    }
    
  } catch (error) {
    console.error('RAG generation error:', error)
    return {
      answer: "I encountered an error while processing your question. Please try again.",
      citations: [],
      retrieved_chunks: 0,
      confidence: 0
    }
  }
}

// Re-export types for convenience
export type { ChunkResult, Citation }
