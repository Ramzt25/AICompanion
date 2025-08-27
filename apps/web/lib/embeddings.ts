// Simple embeddings utility for the AI Knowledge Companion
// In production, this would connect to OpenAI API or other embedding services

/**
 * Generate embeddings for text
 * @param text - Text to generate embeddings for
 * @returns Promise<number[]> - Vector embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // For demo purposes, return a mock embedding
  // In production, this would call OpenAI's embedding API
  const mockEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5)
  
  // Add some consistency based on text content
  const textHash = hashString(text)
  for (let i = 0; i < 10; i++) {
    mockEmbedding[i] = (textHash % 1000) / 1000 - 0.5
  }
  
  return mockEmbedding
}

/**
 * Calculate cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns number - Similarity score between -1 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must be the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Simple hash function for consistent mock embeddings
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Batch generate embeddings for multiple texts
 * @param texts - Array of texts to embed
 * @returns Promise<number[][]> - Array of embeddings
 */
export async function batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
  // In production, this would batch the API calls for efficiency
  return Promise.all(texts.map(text => generateEmbedding(text)))
}

/**
 * Find most similar texts to a query
 * @param query - Query text
 * @param candidates - Candidate texts with their embeddings
 * @param topK - Number of results to return
 * @returns Promise<Array<{text: string, similarity: number}>>
 */
export async function findSimilarTexts(
  query: string,
  candidates: Array<{ text: string; embedding: number[] }>,
  topK: number = 5
): Promise<Array<{ text: string; similarity: number }>> {
  const queryEmbedding = await generateEmbedding(query)
  
  const similarities = candidates.map(candidate => ({
    text: candidate.text,
    similarity: cosineSimilarity(queryEmbedding, candidate.embedding)
  }))
  
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
}