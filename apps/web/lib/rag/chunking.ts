export function chunkText(
  text: string,
  maxTokens: number = 600,
  overlapTokens: number = 100
): string[] {
  // Simple implementation - split by sentences and approximate tokens
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks: string[] = []
  let currentChunk = ''
  let currentTokens = 0

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence)
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk.trim())
      
      // Start new chunk with overlap
      const overlapWords = getLastWords(currentChunk, overlapTokens)
      currentChunk = overlapWords + ' ' + sentence
      currentTokens = estimateTokens(currentChunk)
    } else {
      currentChunk += ' ' + sentence
      currentTokens += sentenceTokens
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(chunk => chunk.length > 50) // Minimum chunk size
}

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4)
}

function getLastWords(text: string, maxTokens: number): string {
  const words = text.split(' ')
  const targetWords = Math.ceil(maxTokens * 0.75) // Conservative estimate
  return words.slice(-targetWords).join(' ')
}

export function extractCodeBlocks(text: string): { text: string; code: string[] } {
  const codeBlocks: string[] = []
  let textWithoutCode = text

  // Extract code blocks to preserve them during chunking
  const codeRegex = /```[\s\S]*?```|`[^`]+`/g
  let match
  while ((match = codeRegex.exec(text)) !== null) {
    codeBlocks.push(match[0])
    textWithoutCode = textWithoutCode.replace(match[0], `__CODE_BLOCK_${codeBlocks.length - 1}__`)
  }

  return { text: textWithoutCode, code: codeBlocks }
}

export function restoreCodeBlocks(text: string, codeBlocks: string[]): string {
  let result = text
  codeBlocks.forEach((code, index) => {
    result = result.replace(`__CODE_BLOCK_${index}__`, code)
  })
  return result
}