import { withOrgContext } from './db'
import { generateEmbedding } from './embeddings'
import { IndividualUserLearningSystem } from './individual-user-learning'
import type { Feedback, Citation } from '@ai-companion/shared'

export class FeedbackLearningSystem {
  /**
   * Record user feedback on an answer with enhanced individual learning
   */
  static async recordFeedback(
    userId: string,
    orgId: string,
    question: string,
    answer: string,
    citations: Citation[],
    feedbackType: Feedback['feedback_type'],
    feedbackDetails?: string
  ): Promise<Feedback> {
    return await withOrgContext(orgId, userId, async (client) => {
      const result = await client.query(`
        INSERT INTO answer_feedback (user_id, org_id, question, answer, citations, feedback_type, feedback_details)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        userId,
        orgId,
        question,
        answer,
        JSON.stringify(citations),
        feedbackType,
        feedbackDetails
      ])

      const feedback = result.rows[0]

      // Update organizational learning metrics
      await this.updateLearningMetrics(orgId, feedbackType, question, citations, client)

      // NEW: Record individual user interaction for personalized learning
      const userRating = this.feedbackTypeToRating(feedbackType)
      await IndividualUserLearningSystem.recordUserInteraction(
        userId,
        orgId,
        question,
        answer,
        userRating,
        0, // follow-up questions (could be tracked separately)
        'normal' // urgency level (could be inferred from context)
      )

      // NEW: Record document interactions based on citations
      for (const citation of citations) {
        await IndividualUserLearningSystem.recordDocumentInteraction(
          userId,
          orgId,
          citation.doc_id,
          'feedback_given',
          question,
          this.getFeedbackScoreAdjustment(feedbackType)
        )
      }

      return feedback
    })
  }

  /**
   * Update learning metrics based on feedback
   */
  private static async updateLearningMetrics(
    orgId: string,
    feedbackType: Feedback['feedback_type'],
    question: string,
    citations: Citation[],
    client: any
  ) {
    // Update document relevance scores based on feedback
    for (const citation of citations) {
      const scoreAdjustment = this.getFeedbackScoreAdjustment(feedbackType)
      
      await client.query(`
        UPDATE documents 
        SET meta_json = jsonb_set(
          COALESCE(meta_json, '{}'::jsonb),
          '{relevance_score}',
          ((COALESCE((meta_json->>'relevance_score')::decimal, 0.5) * 0.9) + ($1 * 0.1))::text::jsonb
        )
        WHERE id = $2
      `, [scoreAdjustment, citation.doc_id])

      // Update chunk relevance
      await client.query(`
        UPDATE chunks
        SET meta_json = jsonb_set(
          COALESCE(meta_json, '{}'::jsonb),
          '{relevance_score}',
          ((COALESCE((meta_json->>'relevance_score')::decimal, 0.5) * 0.9) + ($1 * 0.1))::text::jsonb
        )
        WHERE id = $2
      `, [scoreAdjustment, citation.chunk_id])
    }

    // Track question patterns for organizational learning
    const questionEmbedding = await generateEmbedding(question)
    
    await client.query(`
      INSERT INTO usage_analytics (org_id, metric_type, metric_value, meta_json)
      VALUES ($1, 'query', $2, $3)
    `, [
      orgId,
      this.getFeedbackScore(feedbackType),
      JSON.stringify({
        question,
        feedback_type: feedbackType,
        question_embedding: questionEmbedding,
        citation_count: citations.length
      })
    ])
  }

  /**
   * Get feedback score adjustment for document/chunk relevance
   */
  private static getFeedbackScoreAdjustment(feedbackType: Feedback['feedback_type']): number {
    switch (feedbackType) {
      case 'good': return 0.8
      case 'helpful': return 0.7
      case 'irrelevant': return 0.2
      case 'bad': return 0.1
      default: return 0.5
    }
  }

  /**
   * Get numeric feedback score for analytics
   */
  private static getFeedbackScore(feedbackType: Feedback['feedback_type']): number {
    switch (feedbackType) {
      case 'good': return 1.0
      case 'helpful': return 0.7
      case 'irrelevant': return 0.3
      case 'bad': return 0.0
      default: return 0.5
    }
  }

  /**
   * Get personalized relevance scores with individual user learning
   */
  static async getPersonalizedRelevanceScores(
    orgId: string,
    userId: string,
    searchResults: Array<{doc_id: string, chunk_id: string, base_score: number}>
  ): Promise<Array<{doc_id: string, chunk_id: string, adjusted_score: number}>> {
    return await withOrgContext(orgId, userId, async (client) => {
      const adjustedResults = []

      for (const result of searchResults) {
        // Get organizational learning data for this document
        const docLearning = await client.query(`
          SELECT 
            COALESCE((meta_json->>'relevance_score')::decimal, 0.5) as org_relevance,
            COUNT(af.*) as feedback_count,
            AVG(CASE 
              WHEN af.feedback_type = 'good' THEN 1.0
              WHEN af.feedback_type = 'helpful' THEN 0.7
              WHEN af.feedback_type = 'irrelevant' THEN 0.3
              WHEN af.feedback_type = 'bad' THEN 0.0
              ELSE 0.5
            END) as avg_feedback_score
          FROM documents d
          LEFT JOIN answer_feedback af ON af.citations::jsonb @> '[{"doc_id": "' || d.id || '"}]'
            AND af.org_id = $1
            AND af.created_at > NOW() - INTERVAL '90 days'
          WHERE d.id = $2
          GROUP BY d.id, d.meta_json
        `, [orgId, result.doc_id])

        // Get user-specific learning data (enhanced)
        const userLearning = await client.query(`
          SELECT 
            COUNT(*) as user_feedback_count,
            AVG(CASE 
              WHEN feedback_type = 'good' THEN 1.0
              WHEN feedback_type = 'helpful' THEN 0.7
              WHEN feedback_type = 'irrelevant' THEN 0.3
              WHEN feedback_type = 'bad' THEN 0.0
              ELSE 0.5
            END) as user_avg_score,
            -- NEW: Get individual user document interaction data
            COALESCE(udi.relevance_score, 0.5) as personal_relevance,
            COALESCE(udi.access_frequency, 0) as access_frequency
          FROM answer_feedback af
          LEFT JOIN user_document_interactions udi ON udi.document_id = $3 AND udi.user_id = $1
          WHERE af.user_id = $1
            AND af.org_id = $2
            AND af.citations::jsonb @> '[{"doc_id": "' || $3 || '"}]'
            AND af.created_at > NOW() - INTERVAL '90 days'
          GROUP BY udi.relevance_score, udi.access_frequency
        `, [userId, orgId, result.doc_id])

        const docData = docLearning.rows[0]
        const userData = userLearning.rows[0]

        // Calculate weighted adjustment with enhanced individual learning
        let adjustmentFactor = 1.0

        // Organizational learning (40% weight - reduced to give more weight to individual learning)
        if (docData.feedback_count > 0) {
          const orgAdjustment = (docData.avg_feedback_score * 0.6) + (docData.org_relevance * 0.4)
          adjustmentFactor *= (0.4 + orgAdjustment * 0.4) // Scale to 0.4-0.8 range
        }

        // User-specific learning (60% weight - increased importance)
        if (userData.user_feedback_count > 0) {
          const userAdjustment = userData.user_avg_score
          adjustmentFactor *= (0.6 + userAdjustment * 0.4) // Scale to 0.6-1.0 range
        }

        // NEW: Individual document interaction history (bonus multiplier)
        if (userData.access_frequency > 0) {
          const frequencyBonus = Math.min(userData.access_frequency * 0.1, 0.3) // Max 30% bonus
          const personalRelevanceBonus = (userData.personal_relevance - 0.5) * 0.2 // ±10% based on personal relevance
          adjustmentFactor *= (1.0 + frequencyBonus + personalRelevanceBonus)
        }

        adjustedResults.push({
          doc_id: result.doc_id,
          chunk_id: result.chunk_id,
          adjusted_score: result.base_score * adjustmentFactor
        })
      }

      return adjustedResults.sort((a, b) => b.adjusted_score - a.adjusted_score)
    })
  }

  /**
   * Get similar questions based on organizational feedback
   */
  static async getSimilarQuestions(
    question: string,
    orgId: string,
    userId: string,
    limit: number = 5
  ): Promise<Array<{question: string, answer: string, similarity: number, feedback_score: number}>> {
    const questionEmbedding = await generateEmbedding(question)

    return await withOrgContext(orgId, userId, async (client) => {
      const result = await client.query(`
        SELECT 
          af.question,
          af.answer,
          af.feedback_type,
          1 - ((meta_json->>'question_embedding')::vector <=> $2::vector) as similarity,
          CASE 
            WHEN af.feedback_type = 'good' THEN 1.0
            WHEN af.feedback_type = 'helpful' THEN 0.7
            WHEN af.feedback_type = 'irrelevant' THEN 0.3
            WHEN af.feedback_type = 'bad' THEN 0.0
            ELSE 0.5
          END as feedback_score
        FROM answer_feedback af
        JOIN usage_analytics ua ON ua.meta_json->>'question' = af.question
        WHERE af.org_id = $1
          AND ua.meta_json->>'question_embedding' IS NOT NULL
          AND af.feedback_type IN ('good', 'helpful')
        ORDER BY similarity DESC, feedback_score DESC
        LIMIT $3
      `, [orgId, `[${questionEmbedding.join(',')}]`, limit])

      return result.rows.filter((row: any) => row.similarity > 0.7)
    })
  }

  /**
   * Get organizational knowledge gaps based on negative feedback
   */
  static async getKnowledgeGaps(
    orgId: string,
    userId: string,
    timeframe: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<Array<{
    topic: string,
    question_count: number,
    bad_feedback_ratio: number,
    sample_questions: string[]
  }>> {
    const intervalMap = {
      week: '7 days',
      month: '30 days',
      quarter: '90 days'
    }

    return await withOrgContext(orgId, userId, async (client) => {
      const result = await client.query(`
        WITH feedback_analysis AS (
          SELECT 
            af.question,
            af.feedback_type,
            -- Extract topic keywords using simple word frequency
            UNNEST(string_to_array(lower(regexp_replace(af.question, '[^a-zA-Z\\s]', '', 'g')), ' ')) as word
          FROM answer_feedback af
          WHERE af.org_id = $1
            AND af.created_at > NOW() - INTERVAL '${intervalMap[timeframe]}'
            AND LENGTH(af.question) > 10
        ),
        topic_metrics AS (
          SELECT 
            word as topic,
            COUNT(DISTINCT question) as question_count,
            COUNT(CASE WHEN feedback_type IN ('bad', 'irrelevant') THEN 1 END) as bad_feedback_count,
            COUNT(*) as total_feedback,
            ARRAY_AGG(DISTINCT question ORDER BY random()) as sample_questions
          FROM feedback_analysis
          WHERE LENGTH(word) > 3  -- Filter out short words
            AND word NOT IN ('what', 'when', 'where', 'how', 'why', 'the', 'and', 'or', 'but', 'for', 'with', 'about')
          GROUP BY word
          HAVING COUNT(DISTINCT question) >= 2
        )
        SELECT 
          topic,
          question_count,
          ROUND((bad_feedback_count::decimal / NULLIF(total_feedback, 0)) * 100, 2) as bad_feedback_ratio,
          sample_questions[1:3] as sample_questions
        FROM topic_metrics
        WHERE bad_feedback_count > 0
        ORDER BY bad_feedback_ratio DESC, question_count DESC
        LIMIT 10
      `, [orgId])

      return result.rows
    })
  }

  /**
   * Generate improvement suggestions based on feedback patterns
   */
  static async getImprovementSuggestions(
    orgId: string,
    userId: string
  ): Promise<Array<{
    type: 'source' | 'content' | 'training',
    suggestion: string,
    impact_score: number,
    data: Record<string, any>
  }>> {
    return await withOrgContext(orgId, userId, async (client) => {
      const suggestions = []

      // Analyze source coverage gaps
      const sourceGaps = await client.query(`
        SELECT 
          af.question,
          COUNT(*) as frequency,
          AVG(CASE WHEN af.feedback_type IN ('bad', 'irrelevant') THEN 1.0 ELSE 0.0 END) as bad_ratio
        FROM answer_feedback af
        WHERE af.org_id = $1
          AND af.created_at > NOW() - INTERVAL '30 days'
        GROUP BY af.question
        HAVING COUNT(*) > 1 
          AND AVG(CASE WHEN af.feedback_type IN ('bad', 'irrelevant') THEN 1.0 ELSE 0.0 END) > 0.5
        ORDER BY frequency DESC, bad_ratio DESC
        LIMIT 5
      `, [orgId])

      for (const gap of sourceGaps.rows) {
        suggestions.push({
          type: 'source' as const,
          suggestion: `Add documentation sources for: "${gap.question}"`,
          impact_score: gap.frequency * gap.bad_ratio,
          data: {
            question: gap.question,
            frequency: gap.frequency,
            bad_ratio: gap.bad_ratio
          }
        })
      }

      // Analyze content quality issues
      const contentIssues = await client.query(`
        SELECT 
          d.title,
          d.uri,
          COUNT(af.*) as negative_feedback_count,
          AVG(COALESCE((d.meta_json->>'relevance_score')::decimal, 0.5)) as current_score
        FROM documents d
        JOIN answer_feedback af ON af.citations::jsonb @> '[{"doc_id": "' || d.id || '"}]'
        WHERE af.org_id = $1
          AND af.feedback_type IN ('bad', 'irrelevant')
          AND af.created_at > NOW() - INTERVAL '30 days'
        GROUP BY d.id, d.title, d.uri, d.meta_json
        HAVING COUNT(af.*) > 2
        ORDER BY negative_feedback_count DESC
        LIMIT 3
      `, [orgId])

      for (const issue of contentIssues.rows) {
        suggestions.push({
          type: 'content' as const,
          suggestion: `Review and update content in: "${issue.title}"`,
          impact_score: issue.negative_feedback_count * (1 - issue.current_score),
          data: {
            document_title: issue.title,
            document_uri: issue.uri,
            negative_feedback_count: issue.negative_feedback_count,
            current_score: issue.current_score
          }
        })
      }

      return suggestions.sort((a, b) => b.impact_score - a.impact_score)
    })
  }

  /**
   * Convert feedback type to numerical rating for individual learning
   */
  private static feedbackTypeToRating(feedbackType: Feedback['feedback_type']): number {
    switch (feedbackType) {
      case 'good': return 5
      case 'helpful': return 4
      case 'irrelevant': return 2
      case 'bad': return 1
      default: return 3
    }
  }

  /**
   * Get individualized improvement suggestions based on user's learning profile
   */
  static async getIndividualizedSuggestions(
    orgId: string,
    userId: string
  ): Promise<Array<{
    type: 'learning' | 'expertise' | 'collaboration' | 'efficiency',
    suggestion: string,
    impact_score: number,
    personalized_reasoning: string
  }>> {
    return await withOrgContext(orgId, userId, async (client) => {
      const suggestions = []

      // Get user's learning journey analysis
      const learningAnalysis = await IndividualUserLearningSystem.analyzeLearningJourney(userId, orgId)
      
      // Get user's recent interaction patterns
      const recentInteractions = await client.query(`
        SELECT 
          query_category,
          AVG(user_rating) as avg_rating,
          COUNT(*) as interaction_count,
          AVG(follow_up_questions) as avg_follow_ups
        FROM user_ai_interactions
        WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY query_category
        HAVING COUNT(*) > 2
        ORDER BY avg_rating ASC, avg_follow_ups DESC
      `, [userId])

      // Learning suggestions based on skill gaps
      for (const gap of learningAnalysis.learningGaps.slice(0, 3)) {
        suggestions.push({
          type: 'learning' as const,
          suggestion: `Develop expertise in ${gap} to match your team's level`,
          impact_score: 0.8,
          personalized_reasoning: `Your team shows strong expertise in ${gap}, but your individual learning profile suggests this is a growth area for you`
        })
      }

      // Efficiency suggestions based on interaction patterns
      const inefficientCategories = recentInteractions.rows.filter((row: any) => 
        row.avg_rating < 3.5 || row.avg_follow_ups > 1.5
      )
      
      for (const category of inefficientCategories.slice(0, 2)) {
        suggestions.push({
          type: 'efficiency' as const,
          suggestion: `Improve ${category.query_category} query patterns for better results`,
          impact_score: (5 - category.avg_rating) * 0.2,
          personalized_reasoning: `Your ${category.query_category} questions typically require ${Math.round(category.avg_follow_ups)} follow-ups and receive ${category.avg_rating}/5 ratings`
        })
      }

      // Collaboration suggestions based on expertise
      for (const expertise of learningAnalysis.expertiseAreas.slice(0, 2)) {
        suggestions.push({
          type: 'collaboration' as const,
          suggestion: `Share your ${expertise} knowledge through documentation or mentoring`,
          impact_score: 0.6,
          personalized_reasoning: `You demonstrate strong expertise in ${expertise} - sharing this knowledge could help your teammates`
        })
      }

      return suggestions.sort((a, b) => b.impact_score - a.impact_score)
    })
  }
}