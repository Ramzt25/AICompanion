import { Pool } from 'pg'
import { OpenAI } from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'

export interface EmbeddingJob {
  chunkId: string
  text: string
  orgId: string
  userId: string
}

export class EmbeddingProcessor {
  private openai: OpenAI

  constructor(private pool: Pool) {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    })
  }

  async process(data: EmbeddingJob) {
    const client = await this.pool.connect()
    
    try {
      console.log(`🧠 Generating embedding for chunk: ${data.chunkId}`)
      
      // Set RLS context
      await client.query('SET app.org_id = $1', [data.orgId])
      await client.query('SET app.user_id = $1', [data.userId])

      // Check if embedding already exists
      const existingEmbedding = await client.query(
        'SELECT embedding FROM chunks WHERE id = $1 AND embedding IS NOT NULL',
        [data.chunkId]
      )

      if (existingEmbedding.rows.length > 0) {
        console.log(`🧠 Embedding already exists for chunk: ${data.chunkId}`)
        return { status: 'exists', chunkId: data.chunkId }
      }

      // Generate embedding using OpenAI
      const response = await this.openai.embeddings.create({
        model: config.openai.embeddingModel,
        input: data.text,
        encoding_format: 'float',
      })

      const embedding = response.data[0].embedding

      // Store embedding in database
      await client.query(
        'UPDATE chunks SET embedding = $1 WHERE id = $2',
        [JSON.stringify(embedding), data.chunkId]
      )

      // Log the processing
      await client.query(`
        INSERT INTO audit (id, actor_id, action, target, result, meta_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        data.userId,
        'embedding_generated',
        data.chunkId,
        'success',
        { 
          model: config.openai.embeddingModel,
          dimensions: embedding.length,
          text_length: data.text.length
        }
      ])

      console.log(`✅ Embedding generated for chunk: ${data.chunkId}`)
      
      return { 
        status: 'generated', 
        chunkId: data.chunkId,
        dimensions: embedding.length 
      }

    } catch (error) {
      console.error('Error generating embedding:', error)
      
      // Log the error
      await client.query(`
        INSERT INTO audit (id, actor_id, action, target, result, meta_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        data.userId,
        'embedding_generated',
        data.chunkId,
        'failure',
        { 
          error: error instanceof Error ? error.message : 'Unknown error',
          text_length: data.text.length
        }
      ])
      
      throw error
    } finally {
      client.release()
    }
  }

  async batchProcess(jobs: EmbeddingJob[]) {
    console.log(`🧠 Processing ${jobs.length} embeddings in batch`)
    
    const results = []
    const batchSize = 10 // Process in smaller batches to avoid rate limits
    
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize)
      const batchPromises = batch.map(job => this.process(job))
      
      try {
        const batchResults = await Promise.allSettled(batchPromises)
        results.push(...batchResults)
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < jobs.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        console.error(`Error in batch ${i / batchSize + 1}:`, error)
        throw error
      }
    }
    
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length
    
    console.log(`✅ Batch embedding complete: ${successful} successful, ${failed} failed`)
    
    return { successful, failed, results }
  }
}