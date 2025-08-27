import { Pool } from 'pg'
import { OpenAI } from 'openai'
import { v4 as uuidv4 } from 'uuid'
import { RRule } from 'rrule'
import { config } from '../config'

export interface AutomationJob {
  automationId: string
  prompt: string
  schedule: string
  ownerId: string
  orgId: string
  scopes?: string[]
}

export class AutomationProcessor {
  private openai: OpenAI

  constructor(private pool: Pool) {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    })
  }

  async process(data: AutomationJob) {
    const client = await this.pool.connect()
    
    try {
      console.log(`🤖 Running automation: ${data.automationId}`)
      
      // Set RLS context
      await client.query('SET app.org_id = $1', [data.orgId])
      await client.query('SET app.user_id = $1', [data.ownerId])

      // Get automation details
      const automation = await client.query(
        'SELECT * FROM automations WHERE id = $1',
        [data.automationId]
      )

      if (automation.rows.length === 0) {
        throw new Error(`Automation ${data.automationId} not found`)
      }

      const automationData = automation.rows[0]
      
      // Check if automation is still active
      if (automationData.status !== 'active') {
        console.log(`⏸️ Automation ${data.automationId} is not active, skipping`)
        return { status: 'skipped', reason: 'inactive' }
      }

      // Gather relevant context based on scopes
      const context = await this.gatherContext(data.scopes || [], data.orgId, client)

      // Generate response using AI
      const response = await this.generateAutomationResponse(data.prompt, context)

      // Update last run timestamp
      await client.query(
        'UPDATE automations SET last_run_at = NOW() WHERE id = $1',
        [data.automationId]
      )

      // Schedule next run based on RRULE
      const nextRun = this.calculateNextRun(data.schedule)
      
      // Log the automation run
      await client.query(`
        INSERT INTO audit (id, actor_id, action, target, result, meta_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        data.ownerId,
        'automation_executed',
        data.automationId,
        'success',
        { 
          prompt: data.prompt,
          response_length: response.length,
          next_run: nextRun,
          context_items: context.length
        }
      ])

      console.log(`✅ Automation completed: ${data.automationId}`)
      
      // TODO: Send the response via configured channels (email, slack, etc.)
      await this.deliverResponse(response, automationData, data.ownerId)
      
      return { 
        status: 'completed', 
        automationId: data.automationId,
        responseLength: response.length,
        nextRun
      }

    } catch (error) {
      console.error('Error running automation:', error)
      
      // Update automation status to error
      await client.query(
        'UPDATE automations SET status = $1 WHERE id = $2',
        ['error', data.automationId]
      )
      
      // Log the error
      await client.query(`
        INSERT INTO audit (id, actor_id, action, target, result, meta_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        uuidv4(),
        data.ownerId,
        'automation_executed',
        data.automationId,
        'failure',
        { 
          error: error instanceof Error ? error.message : 'Unknown error',
          prompt: data.prompt
        }
      ])
      
      throw error
    } finally {
      client.release()
    }
  }

  private async gatherContext(scopes: string[], orgId: string, client: any): Promise<string[]> {
    const context: string[] = []
    
    for (const scope of scopes) {
      try {
        switch (scope) {
          case 'recent_documents':
            const recentDocs = await client.query(`
              SELECT title, meta_json->>'summary' as summary 
              FROM documents 
              WHERE created_at > NOW() - INTERVAL '7 days'
              ORDER BY created_at DESC 
              LIMIT 10
            `)
            context.push(...recentDocs.rows.map((doc: any) => 
              `Document: ${doc.title}${doc.summary ? ` - ${doc.summary}` : ''}`
            ))
            break

          case 'team_activity':
            const activity = await client.query(`
              SELECT action, meta_json 
              FROM audit 
              WHERE created_at > NOW() - INTERVAL '7 days'
              AND result = 'success'
              ORDER BY created_at DESC 
              LIMIT 20
            `)
            context.push(...activity.rows.map((act: any) => 
              `Activity: ${act.action} - ${JSON.stringify(act.meta_json)}`
            ))
            break

          case 'memory':
            const memories = await client.query(`
              SELECT content, kind 
              FROM memories 
              WHERE subject_type = 'org' 
              AND subject_id = $1
              AND (expires_at IS NULL OR expires_at > NOW())
              ORDER BY confidence DESC 
              LIMIT 10
            `, [orgId])
            context.push(...memories.rows.map((mem: any) => 
              `${mem.kind}: ${mem.content}`
            ))
            break
        }
      } catch (error) {
        console.warn(`Error gathering context for scope ${scope}:`, error)
      }
    }
    
    return context
  }

  private async generateAutomationResponse(prompt: string, context: string[]): Promise<string> {
    const systemPrompt = `You are an AI assistant helping with automated organizational tasks. 
Provide helpful, concise responses based on the prompt and available context.

Context:
${context.join('\n')}

Guidelines:
- Be specific and actionable
- Include relevant data from the context
- Keep responses focused and professional
- If context is insufficient, mention what additional information would be helpful`

    const response = await this.openai.chat.completions.create({
      model: config.openai.llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    return response.choices[0].message.content || 'No response generated'
  }

  private calculateNextRun(schedule: string): Date | null {
    try {
      const rule = RRule.fromString(schedule)
      const nextOccurrence = rule.after(new Date())
      return nextOccurrence
    } catch (error) {
      console.error('Error parsing schedule:', error)
      return null
    }
  }

  private async deliverResponse(response: string, automation: any, userId: string): Promise<void> {
    // TODO: Implement delivery mechanisms (email, slack, webhook, etc.)
    console.log(`📤 Delivering automation response to user ${userId}:`)
    console.log(response)
    
    // For now, just log the response
    // In a full implementation, this would:
    // - Send email notifications
    // - Post to Slack channels
    // - Send webhooks
    // - Create in-app notifications
  }
}