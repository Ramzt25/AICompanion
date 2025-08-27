import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import type { Document, Chunk } from '@ai-companion/shared'

export interface DocumentProcessingJob {
  sourceId: string
  uri: string
  title: string
  content?: string
  metadata?: Record<string, any>
  orgId: string
  userId: string
}

export class DocumentProcessor {
  constructor(private pool: Pool) {}

  async process(data: DocumentProcessingJob) {
    const client = await this.pool.connect()
    
    try {
      console.log(`📄 Processing document: ${data.title}`)
      
      // Set RLS context
      await client.query('SET app.org_id = $1', [data.orgId])
      await client.query('SET app.user_id = $1', [data.userId])

      // Check if document already exists
      const existingDoc = await client.query(
        'SELECT id, hash FROM documents WHERE uri = $1 AND source_id = $2',
        [data.uri, data.sourceId]
      )

      // Calculate content hash
      const contentHash = await this.calculateHash(data.content || '')
      
      let documentId: string
      let isNew = false

      if (existingDoc.rows.length > 0) {
        const existing = existingDoc.rows[0]
        if (existing.hash === contentHash) {
          console.log(`📄 Document unchanged: ${data.title}`)
          return { documentId: existing.id, chunksProcessed: 0, status: 'unchanged' }
        }
        documentId = existing.id
        // Update existing document
        await client.query(
          'UPDATE documents SET hash = $1, meta_json = $2, updated_at = NOW() WHERE id = $3',
          [contentHash, data.metadata || {}, documentId]
        )
      } else {
        // Create new document
        documentId = uuidv4()
        isNew = true
        await client.query(`
          INSERT INTO documents (id, source_id, uri, title, hash, meta_json)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [documentId, data.sourceId, data.uri, data.title, contentHash, data.metadata || {}])
      }

      // Process content into chunks if provided
      let chunksProcessed = 0
      if (data.content) {
        // Delete existing chunks if updating
        if (!isNew) {
          await client.query('DELETE FROM chunks WHERE document_id = $1', [documentId])
        }

        // Create chunks
        const chunks = await this.createChunks(data.content, data.metadata)
        
        for (const chunk of chunks) {
          const chunkId = uuidv4()
          await client.query(`
            INSERT INTO chunks (id, document_id, text, token_count, meta_json)
            VALUES ($1, $2, $3, $4, $5)
          `, [chunkId, documentId, chunk.text, chunk.tokenCount, chunk.metadata])
          
          chunksProcessed++
        }
      }

      // Log the processing
      await client.query(`
        INSERT INTO audit (id, actor_id, action, target, result, meta_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        data.userId,
        'document_processed',
        documentId,
        'success',
        { 
          title: data.title, 
          chunks_created: chunksProcessed,
          is_new: isNew
        }
      ])

      console.log(`✅ Document processed: ${data.title} (${chunksProcessed} chunks)`)
      
      return { 
        documentId, 
        chunksProcessed, 
        status: isNew ? 'created' : 'updated' 
      }

    } catch (error) {
      console.error('Error processing document:', error)
      throw error
    } finally {
      client.release()
    }
  }

  private async calculateHash(content: string): Promise<string> {
    const crypto = await import('crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  private async createChunks(content: string, metadata?: Record<string, any>) {
    // Simple chunking strategy - split by paragraphs and limit size
    const maxChunkSize = 1000 // characters
    const overlap = 100 // character overlap between chunks
    
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0)
    const chunks: Array<{ text: string; tokenCount: number; metadata: Record<string, any> }> = []
    
    let currentChunk = ''
    
    for (const paragraph of paragraphs) {
      // Estimate token count (roughly 4 characters per token)
      const estimatedTokens = Math.ceil(paragraph.length / 4)
      
      if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          tokenCount: Math.ceil(currentChunk.length / 4),
          metadata: { ...metadata, chunk_index: chunks.length }
        })
        
        // Start new chunk with overlap
        const words = currentChunk.split(' ')
        const overlapWords = words.slice(-Math.floor(overlap / 5)) // Rough word overlap
        currentChunk = overlapWords.join(' ') + ' ' + paragraph
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }
    
    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        tokenCount: Math.ceil(currentChunk.length / 4),
        metadata: { ...metadata, chunk_index: chunks.length }
      })
    }
    
    return chunks
  }
}