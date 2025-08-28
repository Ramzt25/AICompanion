import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'

export interface AnalyticsJob {
  type: 'usage_metrics' | 'user_behavior' | 'document_analytics' | 'knowledge_gaps' | 'team_insights'
  orgId: string
  userId?: string
  timeRange?: {
    start: Date
    end: Date
  }
  filters?: Record<string, any>
}

export class AnalyticsProcessor {
  constructor(private pool: Pool) {}

  async process(data: AnalyticsJob) {
    const client = await this.pool.connect()
    
    try {
      console.log(`📊 Processing analytics: ${data.type} for org ${data.orgId}`)
      
      // Set RLS context
      await client.query('SET app.org_id = $1', [data.orgId])
      if (data.userId) {
        await client.query('SET app.user_id = $1', [data.userId])
      }

      let result
      switch (data.type) {
        case 'usage_metrics':
          result = await this.calculateUsageMetrics(data, client)
          break
        case 'user_behavior':
          result = await this.analyzeUserBehavior(data, client)
          break
        case 'document_analytics':
          result = await this.analyzeDocumentUsage(data, client)
          break
        case 'knowledge_gaps':
          result = await this.identifyKnowledgeGaps(data, client)
          break
        case 'team_insights':
          result = await this.generateTeamInsights(data, client)
          break
        default:
          throw new Error(`Unknown analytics type: ${data.type}`)
      }

      // Store analytics result
      await client.query(`
        INSERT INTO usage_analytics (id, org_id, user_id, metric_type, meta_json)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        uuidv4(),
        data.orgId,
        data.userId || null,
        data.type,
        result
      ])

      console.log(`✅ Analytics completed: ${data.type}`)
      
      return result

    } catch (error) {
      console.error('Error processing analytics:', error)
      throw error
    } finally {
      client.release()
    }
  }

  private async calculateUsageMetrics(data: AnalyticsJob, client: any) {
    const timeFilter = this.buildTimeFilter(data.timeRange)
    
    // Query various usage metrics
    const queries = await Promise.all([
      // Total queries
      client.query(`
        SELECT COUNT(*) as total_queries
        FROM audit 
        WHERE action = 'chat_query' ${timeFilter}
      `),
      
      // Unique users
      client.query(`
        SELECT COUNT(DISTINCT actor_id) as unique_users
        FROM audit 
        WHERE action = 'chat_query' ${timeFilter}
      `),
      
      // Document views
      client.query(`
        SELECT COUNT(*) as document_views
        FROM audit 
        WHERE action LIKE '%document%' ${timeFilter}
      `),
      
      // Average session length (approximate)
      client.query(`
        SELECT 
          AVG(session_length) as avg_session_minutes
        FROM (
          SELECT 
            actor_id,
            DATE(created_at) as session_date,
            EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))/60 as session_length
          FROM audit 
          WHERE created_at ${this.getDateRange(data.timeRange)}
          GROUP BY actor_id, DATE(created_at)
          HAVING COUNT(*) > 1
        ) sessions
      `),
      
      // Most active hours
      client.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as activity_count
        FROM audit 
        WHERE created_at ${this.getDateRange(data.timeRange)}
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY activity_count DESC
        LIMIT 5
      `)
    ])

    return {
      total_queries: parseInt(queries[0].rows[0]?.total_queries || 0),
      unique_users: parseInt(queries[1].rows[0]?.unique_users || 0),
      document_views: parseInt(queries[2].rows[0]?.document_views || 0),
      avg_session_minutes: parseFloat(queries[3].rows[0]?.avg_session_minutes || 0),
      peak_hours: queries[4].rows,
      calculated_at: new Date().toISOString()
    }
  }

  private async analyzeUserBehavior(data: AnalyticsJob, client: any) {
    const timeFilter = this.buildTimeFilter(data.timeRange)
    
    // Analyze user behavior patterns
    const queries = await Promise.all([
      // Query patterns by user
      client.query(`
        SELECT 
          actor_id,
          COUNT(*) as query_count,
          COUNT(DISTINCT DATE(created_at)) as active_days,
          AVG(CASE WHEN meta_json->>'feedback_type' = 'good' THEN 1 ELSE 0 END) as satisfaction_rate
        FROM audit 
        WHERE action = 'chat_query' ${timeFilter}
        GROUP BY actor_id
        ORDER BY query_count DESC
        LIMIT 20
      `),
      
      // Most common query types
      client.query(`
        SELECT 
          meta_json->>'query_type' as query_type,
          COUNT(*) as frequency
        FROM audit 
        WHERE action = 'chat_query' 
        AND meta_json->>'query_type' IS NOT NULL
        ${timeFilter}
        GROUP BY meta_json->>'query_type'
        ORDER BY frequency DESC
      `),
      
      // Feature usage
      client.query(`
        SELECT 
          action,
          COUNT(*) as usage_count
        FROM audit 
        WHERE action IN ('knowledge_graph_view', 'skill_used', 'automation_created')
        ${timeFilter}
        GROUP BY action
        ORDER BY usage_count DESC
      `)
    ])

    return {
      top_users: queries[0].rows,
      query_patterns: queries[1].rows,
      feature_usage: queries[2].rows,
      analyzed_at: new Date().toISOString()
    }
  }

  private async analyzeDocumentUsage(data: AnalyticsJob, client: any) {
    const timeFilter = this.buildTimeFilter(data.timeRange)
    
    // Analyze document and content usage
    const queries = await Promise.all([
      // Most accessed documents
      client.query(`
        SELECT 
          d.title,
          d.uri,
          COUNT(a.id) as access_count,
          MAX(a.created_at) as last_accessed
        FROM documents d
        JOIN audit a ON a.target = d.id
        WHERE a.action LIKE '%document%' ${timeFilter}
        GROUP BY d.id, d.title, d.uri
        ORDER BY access_count DESC
        LIMIT 10
      `),
      
      // Document upload trends
      client.query(`
        SELECT 
          DATE(created_at) as upload_date,
          COUNT(*) as documents_uploaded
        FROM documents 
        WHERE created_at ${this.getDateRange(data.timeRange)}
        GROUP BY DATE(created_at)
        ORDER BY upload_date DESC
      `),
      
      // Content types analysis
      client.query(`
        SELECT 
          meta_json->>'content_type' as content_type,
          COUNT(*) as count,
          AVG(CASE WHEN meta_json->>'size' IS NOT NULL THEN (meta_json->>'size')::numeric ELSE NULL END) as avg_size
        FROM documents 
        WHERE created_at ${this.getDateRange(data.timeRange)}
        AND meta_json->>'content_type' IS NOT NULL
        GROUP BY meta_json->>'content_type'
        ORDER BY count DESC
      `),
      
      // Citation analysis
      client.query(`
        SELECT 
          target as document_id,
          COUNT(*) as citation_count
        FROM audit 
        WHERE action = 'document_cited' ${timeFilter}
        GROUP BY target
        ORDER BY citation_count DESC
        LIMIT 10
      `)
    ])

    return {
      top_documents: queries[0].rows,
      upload_trends: queries[1].rows,
      content_types: queries[2].rows,
      most_cited: queries[3].rows,
      analyzed_at: new Date().toISOString()
    }
  }

  private async identifyKnowledgeGaps(data: AnalyticsJob, client: any) {
    const timeFilter = this.buildTimeFilter(data.timeRange)
    
    // Identify areas where users frequently ask questions but get poor responses
    const queries = await Promise.all([
      // Low-satisfaction queries
      client.query(`
        SELECT 
          meta_json->>'query' as query,
          COUNT(*) as frequency,
          AVG(CASE WHEN meta_json->>'feedback_type' = 'good' THEN 1 ELSE 0 END) as satisfaction_rate
        FROM audit 
        WHERE action = 'feedback_given' 
        AND meta_json->>'feedback_type' IN ('bad', 'irrelevant')
        ${timeFilter}
        GROUP BY meta_json->>'query'
        HAVING COUNT(*) >= 3
        ORDER BY frequency DESC, satisfaction_rate ASC
        LIMIT 10
      `),
      
      // Frequently asked but unanswered topics
      client.query(`
        SELECT 
          meta_json->>'topic' as topic,
          COUNT(*) as question_count,
          COUNT(CASE WHEN meta_json->>'citations_count'::int = 0 THEN 1 END) as no_citations_count
        FROM audit 
        WHERE action = 'chat_query' ${timeFilter}
        AND meta_json->>'topic' IS NOT NULL
        GROUP BY meta_json->>'topic'
        HAVING COUNT(CASE WHEN meta_json->>'citations_count'::int = 0 THEN 1 END) > 0
        ORDER BY no_citations_count DESC
        LIMIT 10
      `),
      
      // Missing document types (inferred from failed searches)
      client.query(`
        SELECT 
          meta_json->>'search_terms' as search_terms,
          COUNT(*) as failed_searches
        FROM audit 
        WHERE action = 'search_performed' 
        AND meta_json->>'results_count'::int = 0
        ${timeFilter}
        GROUP BY meta_json->>'search_terms'
        ORDER BY failed_searches DESC
        LIMIT 10
      `)
    ])

    return {
      low_satisfaction_queries: queries[0].rows,
      unanswered_topics: queries[1].rows,
      failed_searches: queries[2].rows,
      recommendations: this.generateKnowledgeGapRecommendations(queries),
      analyzed_at: new Date().toISOString()
    }
  }

  private async generateTeamInsights(data: AnalyticsJob, client: any) {
    const timeFilter = this.buildTimeFilter(data.timeRange)
    
    // Generate insights about team collaboration and knowledge sharing
    const queries = await Promise.all([
      // Team activity distribution
      client.query(`
        SELECT 
          u.name,
          COUNT(a.id) as activity_count,
          COUNT(DISTINCT DATE(a.created_at)) as active_days,
          COUNT(CASE WHEN a.action = 'document_shared' THEN 1 END) as documents_shared
        FROM audit a
        JOIN users u ON a.actor_id = u.id
        WHERE a.created_at ${this.getDateRange(data.timeRange)}
        GROUP BY u.id, u.name
        ORDER BY activity_count DESC
      `),
      
      // Knowledge sharing patterns
      client.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(CASE WHEN action = 'document_uploaded' THEN 1 END) as uploads,
          COUNT(CASE WHEN action = 'automation_created' THEN 1 END) as automations,
          COUNT(CASE WHEN action = 'skill_shared' THEN 1 END) as skills_shared
        FROM audit 
        WHERE created_at ${this.getDateRange(data.timeRange)}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `),
      
      // Collaboration metrics
      client.query(`
        SELECT 
          COUNT(DISTINCT actor_id) as unique_contributors,
          COUNT(CASE WHEN action = 'feedback_given' THEN 1 END) as feedback_given,
          COUNT(CASE WHEN action = 'document_commented' THEN 1 END) as comments_made
        FROM audit 
        WHERE created_at ${this.getDateRange(data.timeRange)}
      `)
    ])

    return {
      team_activity: queries[0].rows,
      sharing_trends: queries[1].rows,
      collaboration_metrics: queries[2].rows[0],
      insights: this.generateTeamRecommendations(queries),
      analyzed_at: new Date().toISOString()
    }
  }

  private buildTimeFilter(timeRange?: { start: Date; end: Date }): string {
    if (!timeRange) {
      return "AND created_at >= NOW() - INTERVAL '30 days'"
    }
    
    return `AND created_at BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'`
  }

  private getDateRange(timeRange?: { start: Date; end: Date }): string {
    if (!timeRange) {
      return ">= NOW() - INTERVAL '30 days'"
    }
    
    return `BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'`
  }

  private generateKnowledgeGapRecommendations(queries: any[]): string[] {
    const recommendations: string[] = []
    
    if (queries[0].rows.length > 0) {
      recommendations.push("Consider creating documentation for frequently problematic queries")
    }
    
    if (queries[1].rows.length > 0) {
      recommendations.push("Upload content addressing unanswered topic areas")
    }
    
    if (queries[2].rows.length > 0) {
      recommendations.push("Add documents matching common search terms that return no results")
    }
    
    return recommendations
  }

  private generateTeamRecommendations(queries: any[]): string[] {
    const recommendations: string[] = []
    const teamActivity = queries[0].rows
    const collaborationMetrics = queries[2].rows[0]
    
    if (teamActivity.length > 0) {
      const activeUsers = teamActivity.filter((user: any) => user.activity_count > 10).length
      const totalUsers = teamActivity.length
      
      if (activeUsers / totalUsers < 0.5) {
        recommendations.push("Consider encouraging more team members to actively use the platform")
      }
    }
    
    if (collaborationMetrics.feedback_given < 10) {
      recommendations.push("Encourage team members to provide feedback on AI responses")
    }
    
    if (collaborationMetrics.comments_made < 5) {
      recommendations.push("Promote document commenting and collaboration features")
    }
    
    return recommendations
  }
}