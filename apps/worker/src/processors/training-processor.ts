import { Pool } from 'pg'
import { OpenAI } from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'

export interface TrainingJob {
  organizationId: string
  trainingType: 'custom_model' | 'knowledge_base' | 'skill_training'
  datasetId?: string
  modelName: string
  industryTemplate?: string
  userId: string
}

export class TrainingProcessor {
  private openai: OpenAI

  constructor(private pool: Pool) {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    })
  }

  async process(data: TrainingJob) {
    const client = await this.pool.connect()
    
    try {
      console.log(`🎓 Starting training job: ${data.modelName} for org ${data.organizationId}`)
      
      // Set RLS context
      await client.query('SET app.org_id = $1', [data.organizationId])
      await client.query('SET app.user_id = $1', [data.userId])

      switch (data.trainingType) {
        case 'custom_model':
          return await this.trainCustomModel(data, client)
        case 'knowledge_base':
          return await this.buildKnowledgeBase(data, client)
        case 'skill_training':
          return await this.trainSkillModel(data, client)
        default:
          throw new Error(`Unknown training type: ${data.trainingType}`)
      }

    } catch (error) {
      console.error('Error in training job:', error)
      
      // Log the error
      await client.query(`
        INSERT INTO audit (id, actor_id, action, target, result, meta_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        data.userId,
        'training_job',
        data.modelName,
        'failure',
        { 
          error: error instanceof Error ? error.message : 'Unknown error',
          training_type: data.trainingType,
          organization_id: data.organizationId
        }
      ])
      
      throw error
    } finally {
      client.release()
    }
  }

  private async trainCustomModel(data: TrainingJob, client: any) {
    console.log(`🧠 Training custom model: ${data.modelName}`)

    // Collect training data from organization's documents
    const trainingData = await this.collectTrainingData(data.organizationId, client)
    
    if (trainingData.length < 100) {
      throw new Error('Insufficient training data. Need at least 100 examples.')
    }

    // Prepare training dataset
    const dataset = await this.prepareTrainingDataset(trainingData, data.industryTemplate)

    // For now, simulate model training since OpenAI fine-tuning requires specific API calls
    // In a real implementation, this would:
    // 1. Upload training data to OpenAI
    // 2. Create a fine-tuning job
    // 3. Monitor training progress
    // 4. Deploy the trained model

    const modelId = `ft-${data.organizationId}-${Date.now()}`
    
    // Store model information
    await client.query(`
      INSERT INTO ai_models (id, org_id, name, type, status, training_data_count, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      modelId,
      data.organizationId,
      data.modelName,
      'custom_llm',
      'training',
      trainingData.length,
      data.userId
    ])

    // Simulate training time (in real implementation, this would be async)
    await this.simulateTraining(modelId, client)

    console.log(`✅ Custom model training completed: ${data.modelName}`)
    
    return {
      status: 'completed',
      modelId,
      trainingDataCount: trainingData.length,
      modelName: data.modelName
    }
  }

  private async buildKnowledgeBase(data: TrainingJob, client: any) {
    console.log(`📚 Building knowledge base: ${data.modelName}`)

    // Get all documents and chunks for the organization
    const documentsQuery = await client.query(`
      SELECT d.id, d.title, d.uri, d.meta_json,
             array_agg(
               json_build_object(
                 'id', c.id,
                 'text', c.text,
                 'embedding', c.embedding
               )
             ) as chunks
      FROM documents d
      LEFT JOIN chunks c ON d.id = c.document_id
      WHERE c.embedding IS NOT NULL
      GROUP BY d.id, d.title, d.uri, d.meta_json
    `)

    const documents = documentsQuery.rows

    // Build entity relationships from the knowledge graph
    const entitiesQuery = await client.query(`
      SELECT e.*, 
             array_agg(
               json_build_object(
                 'target_id', er.target_entity_id,
                 'relationship_type', er.relationship_type,
                 'weight', er.weight
               )
             ) as relationships
      FROM entities e
      LEFT JOIN entity_relationships er ON e.id = er.source_entity_id
      GROUP BY e.id
    `)

    const entities = entitiesQuery.rows

    // Calculate knowledge base metrics
    const totalDocuments = documents.length
    const totalChunks = documents.reduce((sum: number, doc: any) => sum + (doc.chunks?.length || 0), 0)
    const totalEntities = entities.length

    // Store knowledge base configuration
    const kbId = `kb-${data.organizationId}-${Date.now()}`
    
    await client.query(`
      INSERT INTO ai_models (id, org_id, name, type, status, meta_json, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      kbId,
      data.organizationId,
      data.modelName,
      'knowledge_base',
      'active',
      {
        documents: totalDocuments,
        chunks: totalChunks,
        entities: totalEntities,
        industry_template: data.industryTemplate,
        created_at: new Date().toISOString()
      },
      data.userId
    ])

    console.log(`✅ Knowledge base built: ${data.modelName}`)
    
    return {
      status: 'completed',
      knowledgeBaseId: kbId,
      totalDocuments,
      totalChunks,
      totalEntities
    }
  }

  private async trainSkillModel(data: TrainingJob, client: any) {
    console.log(`🔧 Training skill model: ${data.modelName}`)

    // For skill training, we focus on specific domains
    const skillData = await this.collectSkillSpecificData(data.industryTemplate || 'general', client)

    // Create specialized prompt templates for the skill
    const promptTemplates = await this.generateSkillPrompts(data.industryTemplate || 'general')

    const skillId = `skill-${data.organizationId}-${Date.now()}`
    
    await client.query(`
      INSERT INTO ai_models (id, org_id, name, type, status, meta_json, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      skillId,
      data.organizationId,
      data.modelName,
      'skill_model',
      'active',
      {
        skill_domain: data.industryTemplate,
        prompt_templates: promptTemplates,
        training_examples: skillData.length,
        created_at: new Date().toISOString()
      },
      data.userId
    ])

    console.log(`✅ Skill model training completed: ${data.modelName}`)
    
    return {
      status: 'completed',
      skillId,
      skillDomain: data.industryTemplate,
      trainingExamples: skillData.length
    }
  }

  private async collectTrainingData(orgId: string, client: any) {
    // Collect diverse training examples from the organization
    const query = await client.query(`
      SELECT 
        c.text,
        d.title,
        d.meta_json,
        c.meta_json as chunk_meta
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE c.text IS NOT NULL 
      AND length(c.text) > 50
      ORDER BY d.created_at DESC
      LIMIT 1000
    `)

    return query.rows.map((row: any) => ({
      content: row.text,
      metadata: {
        document_title: row.title,
        ...row.meta_json,
        ...row.chunk_meta
      }
    }))
  }

  private async prepareTrainingDataset(data: any[], industryTemplate?: string) {
    // Convert raw data into training format
    // This would create prompt-completion pairs for fine-tuning
    return data.map(item => ({
      prompt: `Based on the document "${item.metadata.document_title}", answer questions about: ${item.content.substring(0, 200)}...`,
      completion: item.content
    }))
  }

  private async simulateTraining(modelId: string, client: any) {
    // Simulate training progress
    const stages = ['preparing', 'training', 'validating', 'completed']
    
    for (const stage of stages) {
      await client.query(
        'UPDATE ai_models SET status = $1 WHERE id = $2',
        [stage, modelId]
      )
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  private async collectSkillSpecificData(domain: string, client: any) {
    // Collect data specific to the skill domain
    const domainKeywords = {
      'construction': ['safety', 'compliance', 'OSHA', 'blueprint', 'materials'],
      'legal': ['contract', 'clause', 'statute', 'precedent', 'liability'],
      'healthcare': ['patient', 'diagnosis', 'treatment', 'medication', 'symptoms'],
      'manufacturing': ['quality', 'process', 'equipment', 'standards', 'efficiency']
    }

    const keywords = domainKeywords[domain as keyof typeof domainKeywords] || []
    
    if (keywords.length === 0) {
      return []
    }

    const query = await client.query(`
      SELECT c.text, d.title
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE c.text ILIKE ANY($1)
      LIMIT 500
    `, [keywords.map(k => `%${k}%`)])

    return query.rows
  }

  private async generateSkillPrompts(domain: string) {
    const promptTemplates = {
      'construction': [
        'Analyze the safety compliance of this construction document: {text}',
        'Identify potential OSHA violations in: {text}',
        'Extract key safety requirements from: {text}'
      ],
      'legal': [
        'Analyze the legal implications of this contract clause: {text}',
        'Identify potential legal risks in: {text}',
        'Extract key contractual obligations from: {text}'
      ],
      'healthcare': [
        'Analyze the medical information in: {text}',
        'Identify key symptoms mentioned in: {text}',
        'Extract treatment recommendations from: {text}'
      ],
      'manufacturing': [
        'Analyze the quality standards mentioned in: {text}',
        'Identify process improvements from: {text}',
        'Extract efficiency metrics from: {text}'
      ]
    }

    return promptTemplates[domain as keyof typeof promptTemplates] || [
      'Analyze this content: {text}',
      'Extract key information from: {text}',
      'Summarize the main points in: {text}'
    ]
  }
}