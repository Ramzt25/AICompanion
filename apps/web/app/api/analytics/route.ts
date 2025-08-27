import { NextRequest, NextResponse } from 'next/server'
import { withOrgContext } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('org_id')
    const timeframe = searchParams.get('timeframe') || '30'
    const metric = searchParams.get('metric') || 'overview'
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const userId = 'demo-user-id'

    const analytics = await withOrgContext(orgId, userId, async (client) => {
      switch (metric) {
        case 'overview':
          return await getOverviewAnalytics(client, orgId, timeframe)
        case 'documents':
          return await getDocumentAnalytics(client, orgId, timeframe)
        case 'queries':
          return await getQueryAnalytics(client, orgId, timeframe)
        case 'users':
          return await getUserAnalytics(client, orgId, timeframe)
        case 'knowledge_gaps':
          return await getKnowledgeGapAnalytics(client, orgId, timeframe)
        default:
          throw new Error('Invalid metric type')
      }
    })

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error getting analytics:', error)
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    )
  }
}

async function getOverviewAnalytics(client: any, orgId: string, timeframe: string) {
  const interval = `${timeframe} days`
  
  const [
    totalQueries,
    totalDocuments,
    activeUsers,
    avgConfidence,
    topDocuments,
    queryTrends
  ] = await Promise.all([
    client.query(`
      SELECT COUNT(*) as total
      FROM usage_analytics 
      WHERE org_id = $1 
        AND metric_type = 'query'
        AND created_at > NOW() - INTERVAL '${interval}'
    `, [orgId]),
    
    client.query(`
      SELECT COUNT(DISTINCT d.id) as total
      FROM documents d
      JOIN sources s ON d.source_id = s.id
      WHERE s.org_id = $1
    `, [orgId]),
    
    client.query(`
      SELECT COUNT(DISTINCT user_id) as total
      FROM usage_analytics 
      WHERE org_id = $1 
        AND created_at > NOW() - INTERVAL '${interval}'
    `, [orgId]),
    
    client.query(`
      SELECT 
        AVG(CASE 
          WHEN af.feedback_type = 'good' THEN 0.9
          WHEN af.feedback_type = 'helpful' THEN 0.7
          WHEN af.feedback_type = 'irrelevant' THEN 0.3
          WHEN af.feedback_type = 'bad' THEN 0.1
          ELSE 0.5
        END) as avg_confidence
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.created_at > NOW() - INTERVAL '${interval}'
    `, [orgId]),
    
    client.query(`
      SELECT 
        d.title,
        d.uri,
        COUNT(ua.id) as view_count
      FROM documents d
      JOIN sources s ON d.source_id = s.id
      LEFT JOIN usage_analytics ua ON ua.resource_id = d.id 
        AND ua.metric_type = 'document_view'
        AND ua.created_at > NOW() - INTERVAL '${interval}'
      WHERE s.org_id = $1
      GROUP BY d.id, d.title, d.uri
      ORDER BY view_count DESC
      LIMIT 10
    `, [orgId]),
    
    client.query(`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as query_count
      FROM usage_analytics 
      WHERE org_id = $1 
        AND metric_type = 'query'
        AND created_at > NOW() - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `, [orgId])
  ])

  return {
    total_queries: parseInt(totalQueries.rows[0]?.total || '0'),
    total_documents: parseInt(totalDocuments.rows[0]?.total || '0'),
    active_users: parseInt(activeUsers.rows[0]?.total || '0'),
    avg_confidence: parseFloat(avgConfidence.rows[0]?.avg_confidence || '0'),
    top_documents: topDocuments.rows,
    query_trends: queryTrends.rows
  }
}

async function getDocumentAnalytics(client: any, orgId: string, timeframe: string) {
  const interval = `${timeframe} days`
  
  const [
    documentsBySource,
    documentsByType,
    mostCited,
    leastAccessed
  ] = await Promise.all([
    client.query(`
      SELECT 
        s.display_name,
        s.type,
        COUNT(d.id) as document_count
      FROM sources s
      LEFT JOIN documents d ON s.id = d.source_id
      WHERE s.org_id = $1
      GROUP BY s.id, s.display_name, s.type
      ORDER BY document_count DESC
    `, [orgId]),
    
    client.query(`
      SELECT 
        COALESCE(d.meta_json->>'type', 'unknown') as doc_type,
        COUNT(*) as count
      FROM documents d
      JOIN sources s ON d.source_id = s.id
      WHERE s.org_id = $1
      GROUP BY doc_type
      ORDER BY count DESC
    `, [orgId]),
    
    client.query(`
      SELECT 
        d.title,
        d.uri,
        COUNT(af.id) as citation_count
      FROM documents d
      JOIN sources s ON d.source_id = s.id
      JOIN answer_feedback af ON af.citations::jsonb @> '[{"doc_id": "' || d.id || '"}]'
      WHERE s.org_id = $1 
        AND af.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY d.id, d.title, d.uri
      ORDER BY citation_count DESC
      LIMIT 10
    `, [orgId]),
    
    client.query(`
      SELECT 
        d.title,
        d.uri,
        COALESCE(COUNT(ua.id), 0) as access_count,
        d.updated_at
      FROM documents d
      JOIN sources s ON d.source_id = s.id
      LEFT JOIN usage_analytics ua ON ua.resource_id = d.id 
        AND ua.metric_type = 'document_view'
        AND ua.created_at > NOW() - INTERVAL '${interval}'
      WHERE s.org_id = $1
      GROUP BY d.id, d.title, d.uri, d.updated_at
      ORDER BY access_count ASC, d.updated_at DESC
      LIMIT 10
    `, [orgId])
  ])

  return {
    documents_by_source: documentsBySource.rows,
    documents_by_type: documentsByType.rows,
    most_cited: mostCited.rows,
    least_accessed: leastAccessed.rows
  }
}

async function getQueryAnalytics(client: any, orgId: string, timeframe: string) {
  const interval = `${timeframe} days`
  
  const [
    queryTypes,
    feedbackDistribution,
    frequentQuestions,
    queryLength
  ] = await Promise.all([
    client.query(`
      SELECT 
        CASE 
          WHEN af.question ILIKE '%what%' THEN 'what'
          WHEN af.question ILIKE '%how%' THEN 'how'
          WHEN af.question ILIKE '%when%' THEN 'when'
          WHEN af.question ILIKE '%where%' THEN 'where'
          WHEN af.question ILIKE '%why%' THEN 'why'
          ELSE 'other'
        END as query_type,
        COUNT(*) as count
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY query_type
      ORDER BY count DESC
    `, [orgId]),
    
    client.query(`
      SELECT 
        feedback_type,
        COUNT(*) as count
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY feedback_type
      ORDER BY count DESC
    `, [orgId]),
    
    client.query(`
      SELECT 
        af.question,
        COUNT(*) as frequency,
        AVG(CASE 
          WHEN af.feedback_type = 'good' THEN 1.0
          WHEN af.feedback_type = 'helpful' THEN 0.7
          WHEN af.feedback_type = 'irrelevant' THEN 0.3
          WHEN af.feedback_type = 'bad' THEN 0.0
          ELSE 0.5
        END) as avg_score
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY af.question
      ORDER BY frequency DESC
      LIMIT 10
    `, [orgId]),
    
    client.query(`
      SELECT 
        CASE 
          WHEN LENGTH(question) < 20 THEN 'short'
          WHEN LENGTH(question) < 100 THEN 'medium'
          ELSE 'long'
        END as length_category,
        COUNT(*) as count,
        AVG(LENGTH(question)) as avg_length
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY length_category
      ORDER BY count DESC
    `, [orgId])
  ])

  return {
    query_types: queryTypes.rows,
    feedback_distribution: feedbackDistribution.rows,
    frequent_questions: frequentQuestions.rows,
    query_length_distribution: queryLength.rows
  }
}

async function getUserAnalytics(client: any, orgId: string, timeframe: string) {
  const interval = `${timeframe} days`
  
  const [
    userActivity,
    topUsers,
    userEngagement
  ] = await Promise.all([
    client.query(`
      SELECT 
        u.name,
        u.email,
        COUNT(ua.id) as total_actions,
        COUNT(CASE WHEN ua.metric_type = 'query' THEN 1 END) as queries,
        COUNT(CASE WHEN ua.metric_type = 'document_view' THEN 1 END) as document_views
      FROM users u
      LEFT JOIN usage_analytics ua ON u.id = ua.user_id 
        AND ua.created_at > NOW() - INTERVAL '${interval}'
      WHERE u.org_id = $1
      GROUP BY u.id, u.name, u.email
      ORDER BY total_actions DESC
    `, [orgId]),
    
    client.query(`
      SELECT 
        u.name,
        COUNT(af.id) as feedback_count,
        AVG(CASE 
          WHEN af.feedback_type = 'good' THEN 1.0
          WHEN af.feedback_type = 'helpful' THEN 0.7
          WHEN af.feedback_type = 'irrelevant' THEN 0.3
          WHEN af.feedback_type = 'bad' THEN 0.0
          ELSE 0.5
        END) as avg_satisfaction
      FROM users u
      LEFT JOIN answer_feedback af ON u.id = af.user_id 
        AND af.created_at > NOW() - INTERVAL '${interval}'
      WHERE u.org_id = $1
      GROUP BY u.id, u.name
      HAVING COUNT(af.id) > 0
      ORDER BY feedback_count DESC
      LIMIT 10
    `, [orgId]),
    
    client.query(`
      SELECT 
        DATE_TRUNC('day', ua.created_at) as date,
        COUNT(DISTINCT ua.user_id) as active_users
      FROM usage_analytics ua
      JOIN users u ON ua.user_id = u.id
      WHERE u.org_id = $1 
        AND ua.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY DATE_TRUNC('day', ua.created_at)
      ORDER BY date
    `, [orgId])
  ])

  return {
    user_activity: userActivity.rows,
    top_users: topUsers.rows,
    user_engagement_trends: userEngagement.rows
  }
}

async function getKnowledgeGapAnalytics(client: any, orgId: string, timeframe: string) {
  const interval = `${timeframe} days`
  
  const [
    gapsByTopic,
    unansweredQuestions,
    lowConfidenceAreas
  ] = await Promise.all([
    client.query(`
      WITH topic_analysis AS (
        SELECT 
          UNNEST(string_to_array(lower(regexp_replace(af.question, '[^a-zA-Z\\s]', '', 'g')), ' ')) as word,
          af.feedback_type
        FROM answer_feedback af
        JOIN users u ON af.user_id = u.id
        WHERE u.org_id = $1 
          AND af.created_at > NOW() - INTERVAL '${interval}'
          AND LENGTH(af.question) > 10
      )
      SELECT 
        word as topic,
        COUNT(*) as mentions,
        COUNT(CASE WHEN feedback_type IN ('bad', 'irrelevant') THEN 1 END) as negative_feedback
      FROM topic_analysis
      WHERE LENGTH(word) > 3
        AND word NOT IN ('what', 'when', 'where', 'how', 'why', 'the', 'and', 'or', 'but', 'for', 'with', 'about')
      GROUP BY word
      HAVING COUNT(*) > 2
      ORDER BY negative_feedback DESC, mentions DESC
      LIMIT 10
    `, [orgId]),
    
    client.query(`
      SELECT 
        af.question,
        COUNT(*) as frequency,
        COUNT(CASE WHEN af.feedback_type IN ('bad', 'irrelevant') THEN 1 END) as negative_count
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY af.question
      HAVING COUNT(CASE WHEN af.feedback_type IN ('bad', 'irrelevant') THEN 1 END) > 0
      ORDER BY negative_count DESC, frequency DESC
      LIMIT 10
    `, [orgId]),
    
    client.query(`
      SELECT 
        SUBSTRING(af.question, 1, 100) as question_preview,
        COUNT(*) as frequency,
        AVG(CASE 
          WHEN af.feedback_type = 'good' THEN 0.9
          WHEN af.feedback_type = 'helpful' THEN 0.7
          WHEN af.feedback_type = 'irrelevant' THEN 0.3
          WHEN af.feedback_type = 'bad' THEN 0.1
          ELSE 0.5
        END) as confidence_score
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.created_at > NOW() - INTERVAL '${interval}'
      GROUP BY af.question
      ORDER BY confidence_score ASC, frequency DESC
      LIMIT 10
    `, [orgId])
  ])

  return {
    gaps_by_topic: gapsByTopic.rows,
    unanswered_questions: unansweredQuestions.rows,
    low_confidence_areas: lowConfidenceAreas.rows
  }
}