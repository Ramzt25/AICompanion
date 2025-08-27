import { withOrgContext } from './db'
import type { PageContext, ContextualSuggestion } from '@ai-companion/shared'

export class ContextualCopilot {
  /**
   * Track user's current page context and activity
   */
  static async updateContext(
    userId: string,
    orgId: string,
    pageType: PageContext['page_type'],
    contextData: Record<string, any> = {}
  ) {
    await withOrgContext(orgId, userId, async (client) => {
      await client.query(`
        INSERT INTO page_contexts (user_id, page_type, context_data, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          page_type = EXCLUDED.page_type,
          context_data = EXCLUDED.context_data,
          updated_at = NOW()
      `, [userId, pageType, JSON.stringify(contextData)])
    })
  }

  /**
   * Get proactive suggestions based on current context
   */
  static async getSuggestions(
    userId: string,
    orgId: string
  ): Promise<ContextualSuggestion[]> {
    return await withOrgContext(orgId, userId, async (client) => {
      // Get current context
      const contextResult = await client.query(`
        SELECT page_type, context_data, created_at
        FROM page_contexts 
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `, [userId])

      if (contextResult.rows.length === 0) {
        return this.getDefaultSuggestions(orgId)
      }

      const context = contextResult.rows[0]
      const suggestions: ContextualSuggestion[] = []

      switch (context.page_type) {
        case 'chat':
          suggestions.push(...await this.getChatSuggestions(orgId, userId, client))
          break
        case 'sources':
          suggestions.push(...await this.getSourcesSuggestions(orgId, userId, client))
          break
        case 'automations':
          suggestions.push(...await this.getAutomationsSuggestions(orgId, userId, client))
          break
        case 'memory':
          suggestions.push(...await this.getMemorySuggestions(orgId, userId, client))
          break
        case 'analytics':
          suggestions.push(...await this.getAnalyticsSuggestions(orgId, userId, client))
          break
      }

      return suggestions
    })
  }

  private static async getChatSuggestions(
    orgId: string,
    userId: string,
    client: any
  ): Promise<ContextualSuggestion[]> {
    const suggestions: ContextualSuggestion[] = []

    // Suggest recent documents that might be relevant
    const recentDocs = await client.query(`
      SELECT d.title, d.uri, COUNT(ua.id) as view_count
      FROM documents d
      JOIN sources s ON d.source_id = s.id
      LEFT JOIN usage_analytics ua ON ua.resource_id = d.id 
        AND ua.metric_type = 'document_view'
        AND ua.created_at > NOW() - INTERVAL '7 days'
      WHERE s.org_id = $1
      GROUP BY d.id, d.title, d.uri
      ORDER BY view_count DESC, d.updated_at DESC
      LIMIT 3
    `, [orgId])

    for (const doc of recentDocs.rows) {
      suggestions.push({
        type: 'query',
        title: `Ask about ${doc.title}`,
        description: `Recent document with ${doc.view_count} recent views`,
        action: `/api/chat`,
        confidence: 0.8,
        context_data: { 
          suggested_query: `What are the key points in ${doc.title}?`,
          document_uri: doc.uri
        }
      })
    }

    // Suggest based on recent questions from team
    const teamQuestions = await client.query(`
      SELECT af.question, COUNT(*) as frequency
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.feedback_type = 'good'
        AND af.created_at > NOW() - INTERVAL '7 days'
      GROUP BY af.question
      ORDER BY frequency DESC
      LIMIT 2
    `, [orgId])

    for (const q of teamQuestions.rows) {
      suggestions.push({
        type: 'query',
        title: 'Popular team question',
        description: q.question.substring(0, 100) + '...',
        action: `/api/chat`,
        confidence: 0.7,
        context_data: { 
          suggested_query: q.question
        }
      })
    }

    return suggestions
  }

  private static async getSourcesSuggestions(
    orgId: string,
    userId: string,
    client: any
  ): Promise<ContextualSuggestion[]> {
    const suggestions: ContextualSuggestion[] = []

    // Check for sources that need syncing
    const staleSources = await client.query(`
      SELECT s.id, s.display_name, s.type, 
             MAX(d.updated_at) as last_sync
      FROM sources s
      LEFT JOIN documents d ON s.id = d.source_id
      WHERE s.org_id = $1 AND s.status = 'active'
      GROUP BY s.id, s.display_name, s.type
      HAVING MAX(d.updated_at) < NOW() - INTERVAL '24 hours' 
        OR MAX(d.updated_at) IS NULL
      LIMIT 3
    `, [orgId])

    for (const source of staleSources.rows) {
      suggestions.push({
        type: 'action',
        title: `Sync ${source.display_name}`,
        description: `Last synced ${source.last_sync ? new Date(source.last_sync).toLocaleDateString() : 'never'}`,
        action: `/api/ingest`,
        confidence: 0.9,
        context_data: { 
          source_id: source.id,
          action_type: 'sync'
        }
      })
    }

    // Suggest adding new connector types
    const existingTypes = await client.query(`
      SELECT DISTINCT type 
      FROM sources 
      WHERE org_id = $1
    `, [orgId])

    const availableTypes = ['google_drive', 'github', 'slack', 'email', 'web']
    const missingTypes = availableTypes.filter(
      type => !existingTypes.rows.some(row => row.type === type)
    )

    if (missingTypes.length > 0) {
      suggestions.push({
        type: 'action',
        title: `Add ${missingTypes[0]} connector`,
        description: `Connect your ${missingTypes[0]} to expand knowledge base`,
        action: `/sources/add`,
        confidence: 0.6,
        context_data: { 
          connector_type: missingTypes[0]
        }
      })
    }

    return suggestions
  }

  private static async getAutomationsSuggestions(
    orgId: string,
    userId: string,
    client: any
  ): Promise<ContextualSuggestion[]> {
    const suggestions: ContextualSuggestion[] = []

    // Suggest automations based on frequent queries
    const frequentQueries = await client.query(`
      SELECT af.question, COUNT(*) as frequency
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.created_at > NOW() - INTERVAL '30 days'
      GROUP BY af.question
      HAVING COUNT(*) > 3
      ORDER BY frequency DESC
      LIMIT 2
    `, [orgId])

    for (const query of frequentQueries.rows) {
      suggestions.push({
        type: 'automation',
        title: 'Create automation for frequent query',
        description: `"${query.question.substring(0, 60)}..." asked ${query.frequency} times`,
        action: `/automations/create`,
        confidence: 0.8,
        context_data: { 
          suggested_prompt: query.question,
          frequency: query.frequency
        }
      })
    }

    return suggestions
  }

  private static async getMemorySuggestions(
    orgId: string,
    userId: string,
    client: any
  ): Promise<ContextualSuggestion[]> {
    const suggestions: ContextualSuggestion[] = []

    // Suggest creating memories from recent interactions
    const recentInteractions = await client.query(`
      SELECT af.question, af.answer, af.feedback_type
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.feedback_type = 'good'
        AND af.created_at > NOW() - INTERVAL '7 days'
      ORDER BY af.created_at DESC
      LIMIT 3
    `, [orgId])

    for (const interaction of recentInteractions.rows) {
      suggestions.push({
        type: 'action',
        title: 'Save as organizational memory',
        description: `Good answer about: ${interaction.question.substring(0, 60)}...`,
        action: `/api/memory/create`,
        confidence: 0.7,
        context_data: { 
          question: interaction.question,
          answer: interaction.answer,
          kind: 'fact'
        }
      })
    }

    return suggestions
  }

  private static async getAnalyticsSuggestions(
    orgId: string,
    userId: string,
    client: any
  ): Promise<ContextualSuggestion[]> {
    const suggestions: ContextualSuggestion[] = []

    // Suggest investigating knowledge gaps
    const gapAnalysis = await client.query(`
      SELECT af.question, COUNT(*) as bad_feedback
      FROM answer_feedback af
      JOIN users u ON af.user_id = u.id
      WHERE u.org_id = $1 
        AND af.feedback_type IN ('bad', 'irrelevant')
        AND af.created_at > NOW() - INTERVAL '30 days'
      GROUP BY af.question
      HAVING COUNT(*) > 1
      ORDER BY bad_feedback DESC
      LIMIT 2
    `, [orgId])

    for (const gap of gapAnalysis.rows) {
      suggestions.push({
        type: 'document',
        title: 'Knowledge gap identified',
        description: `"${gap.question.substring(0, 60)}..." needs better sources`,
        action: `/sources/add`,
        confidence: 0.8,
        context_data: { 
          knowledge_gap: gap.question,
          bad_feedback_count: gap.bad_feedback
        }
      })
    }

    return suggestions
  }

  private static getDefaultSuggestions(orgId: string): ContextualSuggestion[] {
    return [
      {
        type: 'query',
        title: 'Try asking a question',
        description: 'Ask about your documents to get started',
        action: `/api/chat`,
        confidence: 0.5,
        context_data: { 
          suggested_query: "What documents do we have available?"
        }
      },
      {
        type: 'action',
        title: 'Add your first data source',
        description: 'Connect Google Drive, GitHub, or upload files',
        action: `/sources/add`,
        confidence: 0.8,
        context_data: {}
      }
    ]
  }
}