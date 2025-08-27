import { withOrgContext } from './db'
import { generateEmbedding } from './embeddings'
import type { Entity, EntityRelationship } from '@ai-companion/shared'

export class KnowledgeGraph {
  /**
   * Extract entities from text using AI
   */
  static async extractEntities(
    text: string,
    orgId: string,
    userId: string,
    documentId?: string
  ): Promise<Entity[]> {
    // Use OpenAI to extract structured entities
    const prompt = `
Extract entities from the following text. Return a JSON array of entities with the following structure:
{
  "type": "person|project|spec|deadline|document|task",
  "name": "Entity name",
  "description": "Brief description",
  "properties": {
    "additional": "context-specific properties"
  }
}

Text: ${text.substring(0, 2000)}
`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      })
    })

    const result = await response.json()
    
    try {
      const extractedEntities = JSON.parse(result.choices[0].message.content)
      const entities: Entity[] = []

      for (const entityData of extractedEntities) {
        // Generate embedding for semantic search
        const embedding = await generateEmbedding(
          `${entityData.name} ${entityData.description || ''}`
        )

        const entity = await this.createEntity(
          orgId,
          userId,
          entityData.type,
          entityData.name,
          entityData.description,
          entityData.properties,
          embedding,
          documentId
        )

        if (entity) entities.push(entity)
      }

      return entities
    } catch (error) {
      console.error('Failed to parse entities:', error)
      return []
    }
  }

  /**
   * Create or update an entity in the knowledge graph
   */
  static async createEntity(
    orgId: string,
    userId: string,
    type: Entity['type'],
    name: string,
    description?: string,
    properties?: Record<string, any>,
    embedding?: number[],
    documentId?: string
  ): Promise<Entity | null> {
    return await withOrgContext(orgId, userId, async (client) => {
      // Check if entity already exists
      const existing = await client.query(`
        SELECT * FROM entities 
        WHERE org_id = $1 AND type = $2 AND name = $3
      `, [orgId, type, name])

      if (existing.rows.length > 0) {
        // Update existing entity
        const entityId = existing.rows[0].id
        await client.query(`
          UPDATE entities 
          SET description = COALESCE($1, description),
              properties = COALESCE($2, properties),
              embedding = COALESCE($3, embedding),
              updated_at = NOW()
          WHERE id = $4
        `, [description, JSON.stringify(properties), embedding ? `[${embedding.join(',')}]` : null, entityId])

        return { ...existing.rows[0], description, properties }
      } else {
        // Create new entity
        const result = await client.query(`
          INSERT INTO entities (org_id, type, name, description, properties, embedding)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          orgId, 
          type, 
          name, 
          description, 
          JSON.stringify(properties || {}),
          embedding ? `[${embedding.join(',')}]` : null
        ])

        const entity = result.rows[0]

        // Create relationship to document if provided
        if (documentId) {
          await this.createRelationship(
            orgId,
            userId,
            entity.id,
            documentId,
            'references',
            0.8
          )
        }

        return entity
      }
    })
  }

  /**
   * Create relationships between entities
   */
  static async createRelationship(
    orgId: string,
    userId: string,
    sourceEntityId: string,
    targetEntityId: string,
    relationshipType: EntityRelationship['relationship_type'],
    weight: number = 1.0,
    properties?: Record<string, any>
  ): Promise<EntityRelationship | null> {
    return await withOrgContext(orgId, userId, async (client) => {
      // Check if relationship already exists
      const existing = await client.query(`
        SELECT * FROM entity_relationships 
        WHERE org_id = $1 
          AND source_entity_id = $2 
          AND target_entity_id = $3 
          AND relationship_type = $4
      `, [orgId, sourceEntityId, targetEntityId, relationshipType])

      if (existing.rows.length > 0) {
        // Update weight if relationship exists
        await client.query(`
          UPDATE entity_relationships 
          SET weight = GREATEST(weight, $1),
              properties = COALESCE($2, properties)
          WHERE id = $3
        `, [weight, JSON.stringify(properties), existing.rows[0].id])

        return existing.rows[0]
      } else {
        // Create new relationship
        const result = await client.query(`
          INSERT INTO entity_relationships (org_id, source_entity_id, target_entity_id, relationship_type, weight, properties)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [orgId, sourceEntityId, targetEntityId, relationshipType, weight, JSON.stringify(properties || {})])

        return result.rows[0]
      }
    })
  }

  /**
   * Search entities semantically
   */
  static async searchEntities(
    query: string,
    orgId: string,
    userId: string,
    entityTypes?: string[],
    limit: number = 10
  ): Promise<Entity[]> {
    const queryEmbedding = await generateEmbedding(query)

    return await withOrgContext(orgId, userId, async (client) => {
      let typeFilter = ''
      let params = [orgId, `[${queryEmbedding.join(',')}]`, limit]

      if (entityTypes && entityTypes.length > 0) {
        typeFilter = ` AND type = ANY($4)`
        params.push(entityTypes)
      }

      const result = await client.query(`
        SELECT *, 
               1 - (embedding <=> $2) as similarity
        FROM entities 
        WHERE org_id = $1
          AND embedding IS NOT NULL
          ${typeFilter}
        ORDER BY embedding <=> $2
        LIMIT $3
      `, params)

      return result.rows.filter(row => row.similarity > 0.7) // Only return relevant entities
    })
  }

  /**
   * Get entity relationships and build graph traversal
   */
  static async getEntityGraph(
    entityId: string,
    orgId: string,
    userId: string,
    depth: number = 2
  ): Promise<{
    entities: Record<string, Entity>,
    relationships: EntityRelationship[]
  }> {
    return await withOrgContext(orgId, userId, async (client) => {
      const entities: Record<string, Entity> = {}
      const relationships: EntityRelationship[] = []
      const processedEntities = new Set<string>()
      const entityQueue: Array<{id: string, currentDepth: number}> = [{ id: entityId, currentDepth: 0 }]

      while (entityQueue.length > 0) {
        const { id: currentEntityId, currentDepth } = entityQueue.shift()!

        if (processedEntities.has(currentEntityId) || currentDepth > depth) {
          continue
        }

        processedEntities.add(currentEntityId)

        // Get entity details
        const entityResult = await client.query(`
          SELECT * FROM entities WHERE id = $1 AND org_id = $2
        `, [currentEntityId, orgId])

        if (entityResult.rows.length > 0) {
          entities[currentEntityId] = entityResult.rows[0]
        }

        // Get relationships
        const relationshipsResult = await client.query(`
          SELECT * FROM entity_relationships 
          WHERE org_id = $1 
            AND (source_entity_id = $2 OR target_entity_id = $2)
          ORDER BY weight DESC
        `, [orgId, currentEntityId])

        for (const rel of relationshipsResult.rows) {
          relationships.push(rel)

          // Add connected entities to queue for next depth level
          if (currentDepth < depth) {
            const connectedId = rel.source_entity_id === currentEntityId 
              ? rel.target_entity_id 
              : rel.source_entity_id

            if (!processedEntities.has(connectedId)) {
              entityQueue.push({ id: connectedId, currentDepth: currentDepth + 1 })
            }
          }
        }
      }

      return { entities, relationships }
    })
  }

  /**
   * Get entities by type for organizational overview
   */
  static async getEntitiesByType(
    orgId: string,
    userId: string,
    entityType?: Entity['type']
  ): Promise<Record<string, Entity[]>> {
    return await withOrgContext(orgId, userId, async (client) => {
      let typeFilter = ''
      let params = [orgId]

      if (entityType) {
        typeFilter = ' AND type = $2'
        params.push(entityType)
      }

      const result = await client.query(`
        SELECT * FROM entities 
        WHERE org_id = $1 ${typeFilter}
        ORDER BY type, name
      `, params)

      const entitiesByType: Record<string, Entity[]> = {}

      for (const entity of result.rows) {
        if (!entitiesByType[entity.type]) {
          entitiesByType[entity.type] = []
        }
        entitiesByType[entity.type].push(entity)
      }

      return entitiesByType
    })
  }

  /**
   * Auto-detect and create relationships based on text patterns
   */
  static async detectRelationships(
    entities: Entity[],
    orgId: string,
    userId: string,
    contextText: string
  ): Promise<EntityRelationship[]> {
    const relationships: EntityRelationship[] = []

    // Simple relationship detection patterns
    const patterns = [
      {
        pattern: /(.*?)\s+works\s+on\s+(.*?)[\.\,\!]/, 
        type: 'works_on' as const
      },
      {
        pattern: /(.*?)\s+deadline\s+for\s+(.*?)[\.\,\!]/, 
        type: 'deadline_for' as const
      },
      {
        pattern: /(.*?)\s+depends\s+on\s+(.*?)[\.\,\!]/, 
        type: 'depends_on' as const
      },
      {
        pattern: /(.*?)\s+references\s+(.*?)[\.\,\!]/, 
        type: 'references' as const
      }
    ]

    for (const pattern of patterns) {
      const matches = contextText.matchAll(new RegExp(pattern.pattern, 'gi'))
      
      for (const match of matches) {
        const sourceText = match[1].trim().toLowerCase()
        const targetText = match[2].trim().toLowerCase()

        // Find matching entities
        const sourceEntity = entities.find(e => 
          e.name.toLowerCase().includes(sourceText) || 
          sourceText.includes(e.name.toLowerCase())
        )
        const targetEntity = entities.find(e => 
          e.name.toLowerCase().includes(targetText) || 
          targetText.includes(e.name.toLowerCase())
        )

        if (sourceEntity && targetEntity && sourceEntity.id !== targetEntity.id) {
          const relationship = await this.createRelationship(
            orgId,
            userId,
            sourceEntity.id,
            targetEntity.id,
            pattern.type,
            0.7, // Medium confidence for pattern-based detection
            { detected_pattern: pattern.pattern }
          )

          if (relationship) {
            relationships.push(relationship)
          }
        }
      }
    }

    return relationships
  }
}