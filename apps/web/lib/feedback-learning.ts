import { withOrgContext } from './db'
import { generateEmbedding } from './embeddings'
import type { Feedback, Citation } from '@ai-companion/shared'

export class FeedbackLearningSystem {
  /**
   * Record user feedback on an answer
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
   * Get personalized relevance scores for search results
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

        // Get user-specific learning data
        const userLearning = await client.query(`
          SELECT 
            COUNT(*) as user_feedback_count,
            AVG(CASE 
              WHEN feedback_type = 'good' THEN 1.0
              WHEN feedback_type = 'helpful' THEN 0.7
              WHEN feedback_type = 'irrelevant' THEN 0.3
              WHEN feedback_type = 'bad' THEN 0.0
              ELSE 0.5
            END) as user_avg_score
          FROM answer_feedback
          WHERE user_id = $1
            AND org_id = $2
            AND citations::jsonb @> '[{"doc_id": "' || $3 || '"}]'
            AND created_at > NOW() - INTERVAL '90 days'
        `, [userId, orgId, result.doc_id])

        const docData = docLearning.rows[0]
        const userData = userLearning.rows[0]

        // Calculate weighted adjustment
        let adjustmentFactor = 1.0

        // Organizational learning (60% weight)
        if (docData.feedback_count > 0) {
          const orgAdjustment = (docData.avg_feedback_score * 0.6) + (docData.org_relevance * 0.4)
          adjustmentFactor *= (0.4 + orgAdjustment * 0.6) // Scale to 0.4-1.0 range
        }

        // User-specific learning (40% weight)
        if (userData.user_feedback_count > 0) {
          const userAdjustment = userData.user_avg_score
          adjustmentFactor *= (0.6 + userAdjustment * 0.4) // Scale to 0.6-1.0 range
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

      return result.rows.filter(row => row.similarity > 0.7)
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
          type: 'source',
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
          type: 'content',
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
}