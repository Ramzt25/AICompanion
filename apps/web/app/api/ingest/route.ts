import { NextRequest, NextResponse } from 'next/server'
import { IngestRequestSchema } from '@ai-companion/shared'
import { withOrgContext } from '@/lib/db'
import { chunkText } from '@/lib/rag/chunking'
import { generateEmbedding } from '@/lib/rag/openai'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = IngestRequestSchema.parse(body)
    const { source_id, full_resync } = validated
    
    // For demo, we'll use hardcoded user context
    const userId = 'demo-user-id'
    const orgId = 'demo-org-id' // This should come from authentication

    const result = await withOrgContext(orgId, userId, async (client) => {
      // Get source information
      const sourceResult = await client.query(
        'SELECT * FROM sources WHERE id = $1',
        [source_id]
      )
      
      if (sourceResult.rows.length === 0) {
        throw new Error('Source not found')
      }

      const source = sourceResult.rows[0]
      
      // For demo, we'll add some sample documents to process
      const sampleDocuments = [
        {
          uri: 'demo://sample1',
          title: 'Sample Document 1',
          content: 'This is a sample document about electrical specifications. It contains information about voltage requirements, safety protocols, and installation guidelines for industrial equipment.',
          hash: 'demo-hash-1'
        },
        {
          uri: 'demo://sample2', 
          title: 'Sample Document 2',
          content: 'This document covers lighting design principles. Key topics include LED efficiency, color temperature considerations, and automated dimming systems for commercial buildings.',
          hash: 'demo-hash-2'
        }
      ]

      let processedDocs = 0
      let processedChunks = 0

      for (const doc of sampleDocuments) {
        // Insert or update document
        const docResult = await client.query(`
          INSERT INTO documents (id, source_id, uri, title, hash, meta_json)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (source_id, uri) 
          DO UPDATE SET title = EXCLUDED.title, hash = EXCLUDED.hash, updated_at = now()
          RETURNING id
        `, [
          uuidv4(),
          source_id,
          doc.uri,
          doc.title,
          doc.hash,
          { content_type: 'text/plain', size: doc.content.length }
        ])

        const documentId = docResult.rows[0].id
        processedDocs++

        // Delete existing chunks if full resync
        if (full_resync) {
          await client.query('DELETE FROM chunks WHERE document_id = $1', [documentId])
        }

        // Chunk the content
        const chunks = chunkText(doc.content, 600, 100)
        
        for (const chunk of chunks) {
          // Generate embedding
          const embedding = await generateEmbedding(chunk)
          
          // Insert chunk
          await client.query(`
            INSERT INTO chunks (id, document_id, text, token_count, embedding, meta_json)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            uuidv4(),
            documentId,
            chunk,
            Math.ceil(chunk.length / 4), // Rough token estimate
            JSON.stringify(embedding),
            { chunk_index: processedChunks }
          ])
          
          processedChunks++
        }
      }

      // Log the ingestion
      await client.query(`
        INSERT INTO audit (actor_id, action, target, result, meta_json)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        userId,
        'ingest_documents',
        source_id,
        'success',
        { 
          documents_processed: processedDocs,
          chunks_created: processedChunks,
          full_resync 
        }
      ])

      return {
        documents_processed: processedDocs,
        chunks_created: processedChunks,
        source_type: source.type
      }
    })

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error: any) {
    console.error('Ingest API error:', error)
    
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}