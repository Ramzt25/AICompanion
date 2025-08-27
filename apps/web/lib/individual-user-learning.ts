import { withOrgContext } from './db'
import { generateEmbedding } from './embeddings'
import type { User } from './auth'

export interface UserLearningProfile {
  id: string
  userId: string
  orgId: string
  primaryRole?: string
  workPatterns: Record<string, any>
  expertiseAreas: string[]
  learningPreferences: Record<string, any>
  avgQueryComplexity: number
  preferredResponseLength: 'brief' | 'medium' | 'detailed'
  citationPreference: 'minimal' | 'balanced' | 'comprehensive'
  satisfactionScore: number
  engagementLevel: number
}

export interface UserExpertiseSignal {
  topicArea: string
  expertiseLevel: number
  confidenceScore: number
  evidenceType: string
  evidenceData: Record<string, any>
}

export interface PersonalizedResponse {
  content: string
  style: 'technical' | 'simplified' | 'step-by-step' | 'summary'
  detailLevel: 'brief' | 'standard' | 'comprehensive'
  citationCount: number
  personalizedContext: string[]
}

export class IndividualUserLearningSystem {
  /**
   * Initialize or update user learning profile based on behavior
   */
  static async initializeUserProfile(user: User): Promise<UserLearningProfile> {
    return await withOrgContext(user.organizationId || 'personal', user.id, async (client) => {
      // Check if profile already exists
      const existing = await client.query(`
        SELECT * FROM user_learning_profiles 
        WHERE user_id = $1 AND org_id = $2
      `, [user.id, user.organizationId || 'personal'])

      if (existing.rows.length > 0) {
        return existing.rows[0]
      }

      // Create new profile with initial detection
      const initialRole = await this.detectUserRole(user.id, user.organizationId || 'personal', client)
      const initialPreferences = await this.detectInitialPreferences(user, client)

      const result = await client.query(`
        INSERT INTO user_learning_profiles (
          user_id, org_id, primary_role, work_patterns, 
          learning_preferences, avg_query_complexity, 
          preferred_response_length, citation_preference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        user.id,
        user.organizationId || 'personal',
        initialRole,
        JSON.stringify(initialPreferences.workPatterns),
        JSON.stringify(initialPreferences.learningPreferences),
        0.5, // Start with medium complexity
        'medium',
        'balanced'
      ])

      return result.rows[0]
    })
  }

  /**
   * Track user interaction and learn from it
   */
  static async recordUserInteraction(
    userId: string,
    orgId: string,
    query: string,
    response: string,
    userRating?: number,
    followUpQuestions: number = 0,
    urgencyLevel: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<void> {
    return await withOrgContext(orgId, userId, async (client) => {
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(query)
      
      // Analyze query complexity
      const complexity = this.calculateQueryComplexity(query)
      
      // Categorize the query
      const category = this.categorizeQuery(query)
      
      // Determine optimal response style based on query and user history
      const responseStyle = await this.determineResponseStyle(userId, query, client)
      
      // Record the interaction
      await client.query(`
        INSERT INTO user_ai_interactions (
          user_id, org_id, query_text, query_category, query_complexity,
          query_embedding, response_style, detail_level, user_rating,
          follow_up_questions, time_of_day, day_of_week, urgency_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        userId, orgId, query, category, complexity,
        `[${queryEmbedding.join(',')}]`, responseStyle.style,
        responseStyle.detailLevel, userRating, followUpQuestions,
        new Date().getHours(), new Date().getDay() + 1, urgencyLevel
      ])

      // Update user learning profile based on this interaction
      await this.updateLearningProfile(userId, orgId, query, userRating, complexity, client)
      
      // Extract and update user expertise signals
      await this.updateExpertiseSignals(userId, orgId, query, userRating, client)
      
      // Update personal entities mentioned in the query
      await this.updatePersonalEntities(userId, orgId, query, client)
    })
  }

  /**
   * Get personalized response configuration for a user
   */
  static async getPersonalizedResponseConfig(
    userId: string,
    orgId: string,
    query: string
  ): Promise<PersonalizedResponse> {
    return await withOrgContext(orgId, userId, async (client) => {
      // Get user's learning profile
      const profile = await client.query(`
        SELECT * FROM user_learning_profiles 
        WHERE user_id = $1 AND org_id = $2
      `, [userId, orgId])

      if (profile.rows.length === 0) {
        // Return default configuration
        return {
          content: '',
          style: 'technical',
          detailLevel: 'standard',
          citationCount: 3,
          personalizedContext: []
        }
      }

      const userProfile = profile.rows[0]
      
      // Get user's expertise areas related to this query
      const queryEmbedding = await generateEmbedding(query)
      const relevantExpertise = await client.query(`
        SELECT topic_area, expertise_level FROM user_expertise_signals
        WHERE user_id = $1 AND expertise_level > 0.6
        ORDER BY expertise_level DESC, confidence_score DESC
        LIMIT 5
      `, [userId])

      // Find similar past queries to learn from user patterns
      const similarQueries = await client.query(`
        SELECT response_style, detail_level, user_rating
        FROM user_ai_interactions
        WHERE user_id = $1 
          AND query_embedding <-> $2::vector < 0.3
          AND user_rating IS NOT NULL
        ORDER BY user_rating DESC, created_at DESC
        LIMIT 10
      `, [userId, `[${queryEmbedding.join(',')}]`])

      // Determine personalized response style
      let responseStyle = userProfile.preferred_response_style || 'technical'
      let detailLevel = userProfile.preferred_response_length || 'standard'
      
      if (similarQueries.rows.length > 0) {
        // Learn from past successful interactions
        const topRatedInteractions = similarQueries.rows.filter((row: any) => row.user_rating >= 4)
        if (topRatedInteractions.length > 0) {
          responseStyle = topRatedInteractions[0].response_style
          detailLevel = topRatedInteractions[0].detail_level
        }
      }

      // Adjust based on user's expertise level in relevant areas
      const userExpertiseAreas = relevantExpertise.rows.map((row: any) => row.topic_area)
      const avgExpertiseLevel = relevantExpertise.rows.length > 0 
        ? relevantExpertise.rows.reduce((sum: number, row: any) => sum + row.expertise_level, 0) / relevantExpertise.rows.length
        : 0.5

      // Adjust detail level based on expertise
      if (avgExpertiseLevel > 0.8) {
        detailLevel = 'brief' // Expert users prefer concise answers
      } else if (avgExpertiseLevel < 0.3) {
        detailLevel = 'comprehensive' // Novices need more detail
      }

      // Get citation preference
      const citationCount = this.getCitationCount(userProfile.citation_preference, detailLevel)

      // Build personalized context
      const personalizedContext = [
        ...userExpertiseAreas,
        userProfile.primary_role,
        `engagement_level:${userProfile.engagement_level}`,
        `satisfaction:${userProfile.satisfaction_score}`
      ].filter(Boolean)

      return {
        content: '',
        style: responseStyle,
        detailLevel,
        citationCount,
        personalizedContext
      }
    })
  }

  /**
   * Update user's document interaction patterns
   */
  static async recordDocumentInteraction(
    userId: string,
    orgId: string,
    documentId: string,
    interactionType: 'query_referenced' | 'explicitly_opened' | 'feedback_given',
    queryContext?: string,
    relevanceScore?: number
  ): Promise<void> {
    return await withOrgContext(orgId, userId, async (client) => {
      await client.query(`
        INSERT INTO user_document_interactions (
          user_id, org_id, document_id, interaction_type, 
          relevance_score, query_context, access_frequency
        ) VALUES ($1, $2, $3, $4, $5, $6, 1)
        ON CONFLICT (user_id, document_id)
        DO UPDATE SET
          access_frequency = user_document_interactions.access_frequency + 1,
          last_accessed = NOW(),
          relevance_score = CASE 
            WHEN $5 IS NOT NULL THEN (user_document_interactions.relevance_score * 0.7 + $5 * 0.3)
            ELSE user_document_interactions.relevance_score
          END,
          query_context = COALESCE($6, user_document_interactions.query_context)
      `, [userId, orgId, documentId, interactionType, relevanceScore, queryContext])
    })
  }

  /**
   * Get personalized document recommendations for a user
   */
  static async getPersonalizedDocumentRecommendations(
    userId: string,
    orgId: string,
    query?: string,
    limit: number = 10
  ): Promise<Array<{
    documentId: string
    title: string
    relevanceScore: number
    personalRelevance: number
    reasoning: string
  }>> {
    return await withOrgContext(orgId, userId, async (client) => {
      let baseQuery = `
        SELECT 
          d.id as document_id,
          d.title,
          d.meta_json->>'relevance_score' as base_relevance,
          COALESCE(udi.relevance_score, 0.5) as personal_relevance,
          COALESCE(udi.access_frequency, 0) as access_frequency,
          ues.topic_area,
          ues.expertise_level
        FROM documents d
        LEFT JOIN user_document_interactions udi ON d.id = udi.document_id AND udi.user_id = $1
        LEFT JOIN user_expertise_signals ues ON ues.user_id = $1 
          AND d.title ILIKE '%' || ues.topic_area || '%'
        WHERE d.org_id = $2
      `

      let params = [userId, orgId]

      if (query) {
        // Add semantic search if query provided
        const queryEmbedding = await generateEmbedding(query)
        baseQuery += ` AND c.embedding <-> $3::vector < 0.4`
        baseQuery += ` JOIN chunks c ON c.document_id = d.id`
        params.push(`[${queryEmbedding.join(',')}]`)
      }

      baseQuery += `
        ORDER BY 
          (COALESCE(udi.relevance_score, 0.5) * 0.4 + 
           COALESCE(ues.expertise_level, 0.3) * 0.3 + 
           COALESCE((d.meta_json->>'relevance_score')::decimal, 0.5) * 0.3) DESC,
          udi.access_frequency DESC NULLS LAST
        LIMIT $${params.length + 1}
      `
      params.push(limit.toString())

      const result = await client.query(baseQuery, params)

      return result.rows.map((row: any) => ({
        documentId: row.document_id,
        title: row.title,
        relevanceScore: parseFloat(row.base_relevance || '0.5'),
        personalRelevance: row.personal_relevance,
        reasoning: this.generateRecommendationReasoning(row)
      }))
    })
  }

  /**
   * Analyze user's learning journey and suggest improvements
   */
  static async analyzeLearningJourney(
    userId: string,
    orgId: string
  ): Promise<{
    skillProgression: Array<{skill: string, level: number, velocity: number}>
    recommendedNextSteps: string[]
    learningGaps: string[]
    expertiseAreas: string[]
  }> {
    return await withOrgContext(orgId, userId, async (client) => {
      // Get current skill progression
      const skillProgression = await client.query(`
        SELECT skill_area, proficiency_level, learning_velocity
        FROM user_learning_journey
        WHERE user_id = $1
        ORDER BY proficiency_level DESC
      `, [userId])

      // Get expertise areas
      const expertiseAreas = await client.query(`
        SELECT topic_area, expertise_level
        FROM user_expertise_signals
        WHERE user_id = $1 AND expertise_level > 0.6
        ORDER BY expertise_level DESC, confidence_score DESC
      `, [userId])

      // Identify learning gaps based on org patterns vs user patterns
      const learningGaps = await client.query(`
        SELECT 
          ues_org.topic_area,
          AVG(ues_org.expertise_level) as org_avg_expertise,
          COALESCE(ues_user.expertise_level, 0) as user_expertise
        FROM user_expertise_signals ues_org
        LEFT JOIN user_expertise_signals ues_user ON ues_user.topic_area = ues_org.topic_area 
          AND ues_user.user_id = $1
        WHERE ues_org.org_id = $2 AND ues_org.user_id != $1
        GROUP BY ues_org.topic_area, ues_user.expertise_level
        HAVING AVG(ues_org.expertise_level) - COALESCE(ues_user.expertise_level, 0) > 0.3
        ORDER BY (AVG(ues_org.expertise_level) - COALESCE(ues_user.expertise_level, 0)) DESC
        LIMIT 5
      `, [userId, orgId])

      // Generate personalized recommendations
      const recommendations = this.generateLearningRecommendations(
        skillProgression.rows,
        expertiseAreas.rows,
        learningGaps.rows
      )

      return {
        skillProgression: skillProgression.rows,
        recommendedNextSteps: recommendations,
        learningGaps: learningGaps.rows.map((row: any) => row.topic_area),
        expertiseAreas: expertiseAreas.rows.map((row: any) => row.topic_area)
      }
    })
  }

  // Private helper methods

  private static async detectUserRole(userId: string, orgId: string, client: any): Promise<string> {
    // Analyze user's query patterns to detect their role
    const queryAnalysis = await client.query(`
      SELECT 
        query_text,
        query_category
      FROM user_ai_interactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [userId])

    const queries = queryAnalysis.rows.map((row: any) => row.query_text.toLowerCase())
    
    // Simple role detection based on query patterns
    if (queries.some((q: string) => q.includes('manage') || q.includes('team') || q.includes('budget'))) {
      return 'manager'
    }
    if (queries.some((q: string) => q.includes('code') || q.includes('technical') || q.includes('implement'))) {
      return 'engineer'
    }
    if (queries.some((q: string) => q.includes('legal') || q.includes('contract') || q.includes('compliance'))) {
      return 'legal'
    }
    if (queries.some((q: string) => q.includes('analysis') || q.includes('report') || q.includes('data'))) {
      return 'analyst'
    }
    
    return 'general'
  }

  private static async detectInitialPreferences(user: User, client: any): Promise<{
    workPatterns: Record<string, any>
    learningPreferences: Record<string, any>
  }> {
    return {
      workPatterns: {
        preferredWorkingHours: user.settings.timezone ? this.getTimezoneWorkingHours(user.settings.timezone) : [9, 17],
        communicationStyle: user.settings.aiPersonality || 'professional'
      },
      learningPreferences: {
        responseStyle: user.settings.aiPersonality === 'technical' ? 'technical' : 'simplified',
        preferredFormat: 'structured'
      }
    }
  }

  private static calculateQueryComplexity(query: string): number {
    const words = query.split(' ').length
    const hasQuestions = (query.match(/\?/g) || []).length
    const hasTechnicalTerms = this.countTechnicalTerms(query)
    const hasMultipleConcepts = query.includes(' and ') || query.includes(' or ')
    
    let complexity = 0.3 // Base complexity
    
    if (words > 20) complexity += 0.2
    if (hasQuestions > 1) complexity += 0.2
    if (hasTechnicalTerms > 2) complexity += 0.2
    if (hasMultipleConcepts) complexity += 0.1
    
    return Math.min(complexity, 1.0)
  }

  private static categorizeQuery(query: string): string {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('how to') || lowerQuery.includes('steps') || lowerQuery.includes('procedure')) {
      return 'procedural'
    }
    if (lowerQuery.includes('what is') || lowerQuery.includes('define') || lowerQuery.includes('explain')) {
      return 'factual'
    }
    if (lowerQuery.includes('analyze') || lowerQuery.includes('compare') || lowerQuery.includes('evaluate')) {
      return 'analytical'
    }
    if (lowerQuery.includes('how') && !lowerQuery.includes('how to')) {
      return 'how-to'
    }
    
    return 'general'
  }

  private static async determineResponseStyle(userId: string, query: string, client: any): Promise<{
    style: string
    detailLevel: string
  }> {
    // Get user's past successful interactions for similar queries
    const queryEmbedding = await generateEmbedding(query)
    
    const similarInteractions = await client.query(`
      SELECT response_style, detail_level, user_rating
      FROM user_ai_interactions
      WHERE user_id = $1 
        AND query_embedding <-> $2::vector < 0.4
        AND user_rating >= 4
      ORDER BY user_rating DESC, created_at DESC
      LIMIT 5
    `, [userId, `[${queryEmbedding.join(',')}]`])

    if (similarInteractions.rows.length > 0) {
      return {
        style: similarInteractions.rows[0].response_style,
        detailLevel: similarInteractions.rows[0].detail_level
      }
    }

    // Default based on query complexity
    const complexity = this.calculateQueryComplexity(query)
    return {
      style: complexity > 0.7 ? 'technical' : 'simplified',
      detailLevel: complexity > 0.6 ? 'comprehensive' : 'standard'
    }
  }

  private static async updateLearningProfile(
    userId: string,
    orgId: string,
    query: string,
    rating: number | undefined,
    complexity: number,
    client: any
  ): Promise<void> {
    if (!rating) return

    await client.query(`
      UPDATE user_learning_profiles
      SET 
        avg_query_complexity = (avg_query_complexity * 0.9 + $1 * 0.1),
        satisfaction_score = (satisfaction_score * 0.9 + $2 * 0.1),
        engagement_level = LEAST(engagement_level + 0.01, 1.0),
        updated_at = NOW()
      WHERE user_id = $3 AND org_id = $4
    `, [complexity, rating / 5.0, userId, orgId])
  }

  private static async updateExpertiseSignals(
    userId: string,
    orgId: string,
    query: string,
    rating: number | undefined,
    client: any
  ): Promise<void> {
    // Extract topics from the query
    const topics = this.extractTopicsFromQuery(query)
    
    for (const topic of topics) {
      const expertiseBoost = rating ? (rating >= 4 ? 0.1 : rating >= 3 ? 0.05 : -0.05) : 0.02
      
      await client.query(`
        INSERT INTO user_expertise_signals (
          user_id, org_id, topic_area, expertise_level, confidence_score,
          evidence_type, evidence_data
        ) VALUES ($1, $2, $3, $4, 0.7, 'query_interaction', $5)
        ON CONFLICT (user_id, topic_area) 
        DO UPDATE SET
          expertise_level = LEAST(user_expertise_signals.expertise_level + $4, 1.0),
          confidence_score = LEAST(user_expertise_signals.confidence_score + 0.1, 1.0),
          updated_at = NOW()
      `, [
        userId, orgId, topic, expertiseBoost,
        JSON.stringify({ query, rating, timestamp: new Date().toISOString() })
      ])
    }
  }

  private static async updatePersonalEntities(
    userId: string,
    orgId: string,
    query: string,
    client: any
  ): Promise<void> {
    const entities = this.extractEntitiesFromQuery(query)
    
    for (const entity of entities) {
      await client.query(`
        INSERT INTO user_personal_entities (
          user_id, org_id, entity_name, entity_type, frequency_mentioned
        ) VALUES ($1, $2, $3, $4, 1)
        ON CONFLICT (user_id, entity_name)
        DO UPDATE SET
          frequency_mentioned = user_personal_entities.frequency_mentioned + 1,
          last_referenced = NOW(),
          relationship_strength = LEAST(user_personal_entities.relationship_strength + 0.1, 1.0)
      `, [userId, orgId, entity.name, entity.type])
    }
  }

  private static getCitationCount(preference: string, detailLevel: string): number {
    if (preference === 'minimal') return detailLevel === 'comprehensive' ? 2 : 1
    if (preference === 'comprehensive') return detailLevel === 'brief' ? 3 : 5
    return detailLevel === 'brief' ? 2 : detailLevel === 'comprehensive' ? 4 : 3
  }

  private static generateRecommendationReasoning(row: any): string {
    const reasons = []
    
    if (row.access_frequency > 5) {
      reasons.push('frequently accessed')
    }
    if (row.personal_relevance > 0.7) {
      reasons.push('high personal relevance')
    }
    if (row.expertise_level > 0.6) {
      reasons.push(`matches your expertise in ${row.topic_area}`)
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'general recommendation'
  }

  private static generateLearningRecommendations(
    skillProgression: any[],
    expertiseAreas: any[],
    learningGaps: any[]
  ): string[] {
    const recommendations: string[] = []
    
    // Recommend advancing in areas where user has moderate skill
    const moderateSkills = skillProgression.filter(skill => 
      skill.proficiency_level > 0.3 && skill.proficiency_level < 0.7
    )
    moderateSkills.slice(0, 2).forEach(skill => {
      recommendations.push(`Advance your ${skill.skill_area} skills to expert level`)
    })
    
    // Recommend addressing learning gaps
    learningGaps.slice(0, 2).forEach(gap => {
      recommendations.push(`Develop knowledge in ${gap.topic_area} to match team level`)
    })
    
    // Recommend leveraging expertise areas
    expertiseAreas.slice(0, 1).forEach(expertise => {
      recommendations.push(`Share your ${expertise.topic_area} expertise with the team`)
    })
    
    return recommendations
  }

  private static getTimezoneWorkingHours(timezone: string): [number, number] {
    // Simple timezone to working hours mapping
    const timezoneHours: Record<string, [number, number]> = {
      'America/New_York': [9, 17],
      'America/Los_Angeles': [9, 17],
      'Europe/London': [9, 17],
      'Asia/Tokyo': [9, 17]
    }
    return timezoneHours[timezone] || [9, 17]
  }

  private static countTechnicalTerms(query: string): number {
    const technicalTerms = ['api', 'database', 'algorithm', 'framework', 'protocol', 'architecture', 'implementation']
    return technicalTerms.filter(term => query.toLowerCase().includes(term)).length
  }

  private static extractTopicsFromQuery(query: string): string[] {
    // Simple topic extraction - in production, use NLP library
    const topics: string[] = []
    const lowerQuery = query.toLowerCase()
    
    const topicKeywords = [
      'safety', 'compliance', 'legal', 'contract', 'project management',
      'finance', 'marketing', 'sales', 'engineering', 'design',
      'operations', 'strategy', 'risk management', 'quality assurance'
    ]
    
    topicKeywords.forEach(keyword => {
      if (lowerQuery.includes(keyword)) {
        topics.push(keyword)
      }
    })
    
    return topics
  }

  private static extractEntitiesFromQuery(query: string): Array<{name: string, type: string}> {
    // Simple entity extraction - in production, use NER
    const entities: Array<{name: string, type: string}> = []
    
    // Look for project names (capitalized words)
    const capitalizedWords = query.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) || []
    capitalizedWords.forEach(word => {
      if (word.length > 2) {
        entities.push({ name: word, type: 'project' })
      }
    })
    
    return entities
  }
}