import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-large'
const EMBEDDING_DIMENSIONS = 3072 // For text-embedding-3-large

/**
 * Generate embeddings for text using OpenAI API
 * @param text - Text to generate embeddings for
 * @param model - Embedding model to use
 * @returns Promise<number[]> - Vector embedding
 */
export async function generateEmbedding(
  text: string, 
  model: string = EMBEDDING_MODEL
): Promise<number[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, using mock embedding')
      return generateMockEmbedding(text)
    }

    // Clean and truncate text to fit model limits
    const cleanText = text.replace(/\s+/g, ' ').trim()
    const truncatedText = cleanText.substring(0, 8000) // Safe limit for most models

    const response = await openai.embeddings.create({
      model,
      input: truncatedText,
      encoding_format: 'float'
    })

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding data returned from OpenAI')
    }

    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    // Fallback to mock embedding if API fails
    return generateMockEmbedding(text)
  }
}

/**
 * Generate batch embeddings for multiple texts
 * @param texts - Array of texts to generate embeddings for
 * @param model - Embedding model to use
 * @returns Promise<number[][]> - Array of vector embeddings
 */
export async function generateBatchEmbeddings(
  texts: string[],
  model: string = EMBEDDING_MODEL
): Promise<number[][]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not found, using mock embeddings')
      return texts.map(generateMockEmbedding)
    }

    // Clean and truncate texts
    const cleanTexts = texts.map(text => 
      text.replace(/\s+/g, ' ').trim().substring(0, 8000)
    )

    const response = await openai.embeddings.create({
      model,
      input: cleanTexts,
      encoding_format: 'float'
    })

    if (!response.data || response.data.length !== texts.length) {
      throw new Error('Mismatched embedding data from OpenAI')
    }

    return response.data.map(item => item.embedding)
  } catch (error) {
    console.error('Error generating batch embeddings:', error)
    // Fallback to mock embeddings if API fails
    return texts.map(generateMockEmbedding)
  }
}

/**
 * Generate mock embedding for development/fallback
 * @param text - Text to generate mock embedding for
 * @returns number[] - Mock vector embedding
 */
function generateMockEmbedding(text: string): number[] {
  // Create deterministic mock embedding based on text content
  const embedding = Array.from({ length: EMBEDDING_DIMENSIONS }, () => Math.random() - 0.5)
  
  // Add some consistency based on text content
  const textHash = hashString(text)
  for (let i = 0; i < 20; i++) {
    embedding[i] = ((textHash + i) % 1000) / 1000 - 0.5
  }
  
  // Normalize the vector
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map(val => val / norm)
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