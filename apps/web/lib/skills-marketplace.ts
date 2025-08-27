import { withOrgContext } from './db'
import type { Skill } from '@ai-companion/shared'

export interface SkillManifest {
  name: string
  version: string
  description: string
  category: 'compliance' | 'extraction' | 'analysis' | 'automation'
  author: string
  license: string
  api_endpoint?: string
  configuration_schema: Record<string, any>
  capabilities: string[]
  requirements: {
    permissions: string[]
    api_keys?: string[]
  }
  pricing?: {
    model: 'free' | 'subscription' | 'usage'
    cost?: number
  }
}

export class SkillsMarketplace {
  /**
   * Register a new skill in the marketplace
   */
  static async registerSkill(
    manifest: SkillManifest,
    adminUserId: string
  ): Promise<Skill> {
    // In a real implementation, this would be restricted to marketplace admins
    const result = await fetch(`${process.env.DATABASE_URL}`, {
      method: 'POST',
      body: JSON.stringify({
        query: `
          INSERT INTO skills (name, description, category, author, version, manifest_json)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `,
        values: [
          manifest.name,
          manifest.description,
          manifest.category,
          manifest.author,
          manifest.version,
          JSON.stringify(manifest)
        ]
      })
    })

    const data = await result.json()
    return data.rows[0]
  }

  /**
   * Browse available skills in the marketplace
   */
  static async browseSkills(
    category?: Skill['category'],
    search?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    skills: Skill[],
    total: number,
    page: number,
    totalPages: number
  }> {
    let whereClause = "WHERE status = 'active'"
    const params: any[] = []
    let paramIndex = 1

    if (category) {
      whereClause += ` AND category = $${paramIndex}`
      params.push(category)
      paramIndex++
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    // In a real implementation, this would use proper database connection
    const countResult = await fetch(`${process.env.DATABASE_URL}`, {
      method: 'POST',
      body: JSON.stringify({
        query: `SELECT COUNT(*) as total FROM skills ${whereClause}`,
        values: params
      })
    })

    const countData = await countResult.json()
    const total = parseInt(countData.rows[0].total)

    const offset = (page - 1) * limit
    params.push(limit, offset)

    const skillsResult = await fetch(`${process.env.DATABASE_URL}`, {
      method: 'POST',
      body: JSON.stringify({
        query: `
          SELECT * FROM skills 
          ${whereClause}
          ORDER BY rating DESC, installation_count DESC, created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
        values: params
      })
    })

    const skillsData = await skillsResult.json()

    return {
      skills: skillsData.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Install a skill for an organization
   */
  static async installSkill(
    orgId: string,
    userId: string,
    skillId: string,
    configuration: Record<string, any> = {}
  ): Promise<{success: boolean, message: string}> {
    return await withOrgContext(orgId, userId, async (client) => {
      // Check if skill exists and is active
      const skillResult = await client.query(`
        SELECT * FROM skills WHERE id = $1 AND status = 'active'
      `, [skillId])

      if (skillResult.rows.length === 0) {
        return { success: false, message: 'Skill not found or inactive' }
      }

      const skill = skillResult.rows[0]
      const manifest = skill.manifest_json as SkillManifest

      // Validate configuration against schema
      const validationResult = this.validateConfiguration(configuration, manifest.configuration_schema)
      if (!validationResult.valid) {
        return { success: false, message: `Configuration validation failed: ${validationResult.errors.join(', ')}` }
      }

      // Check if already installed
      const existingResult = await client.query(`
        SELECT * FROM org_skills WHERE org_id = $1 AND skill_id = $2
      `, [orgId, skillId])

      if (existingResult.rows.length > 0) {
        return { success: false, message: 'Skill already installed' }
      }

      // Check organization plan limits
      const planLimitsResult = await client.query(`
        SELECT 
          plan,
          features_json,
          (SELECT COUNT(*) FROM org_skills WHERE org_id = $1 AND status = 'active') as current_skills
        FROM orgs WHERE id = $1
      `, [orgId])

      const orgData = planLimitsResult.rows[0]
      const maxSkills = this.getMaxSkillsForPlan(orgData.plan)

      if (orgData.current_skills >= maxSkills) {
        return { 
          success: false, 
          message: `Plan limit reached. ${orgData.plan} plan allows maximum ${maxSkills} skills.` 
        }
      }

      // Install the skill
      await client.query(`
        INSERT INTO org_skills (org_id, skill_id, configuration, status)
        VALUES ($1, $2, $3, 'active')
      `, [orgId, skillId, JSON.stringify(configuration)])

      // Update installation count
      await client.query(`
        UPDATE skills 
        SET installation_count = installation_count + 1 
        WHERE id = $1
      `, [skillId])

      // Log the installation
      await client.query(`
        INSERT INTO audit (actor_id, action, target, result, meta_json)
        VALUES ($1, 'skill_install', $2, 'success', $3)
      `, [
        userId,
        skillId,
        JSON.stringify({ skill_name: skill.name, configuration })
      ])

      return { success: true, message: 'Skill installed successfully' }
    })
  }

  /**
   * Execute a skill with given input
   */
  static async executeSkill(
    orgId: string,
    userId: string,
    skillId: string,
    input: Record<string, any>
  ): Promise<{success: boolean, result?: any, error?: string}> {
    return await withOrgContext(orgId, userId, async (client) => {
      // Check if skill is installed for org
      const installationResult = await client.query(`
        SELECT os.*, s.manifest_json, s.name
        FROM org_skills os
        JOIN skills s ON os.skill_id = s.id
        WHERE os.org_id = $1 AND os.skill_id = $2 AND os.status = 'active'
      `, [orgId, skillId])

      if (installationResult.rows.length === 0) {
        return { success: false, error: 'Skill not installed or inactive' }
      }

      const installation = installationResult.rows[0]
      const manifest = installation.manifest_json as SkillManifest

      try {
        // Execute skill based on its type
        let result
        
        if (manifest.api_endpoint) {
          // External skill via API
          result = await this.executeExternalSkill(manifest, installation.configuration, input)
        } else {
          // Built-in skill
          result = await this.executeBuiltInSkill(manifest.name, input, orgId, userId)
        }

        // Log usage
        await client.query(`
          INSERT INTO usage_analytics (org_id, user_id, metric_type, resource_id, meta_json)
          VALUES ($1, $2, 'skill_use', $3, $4)
        `, [
          orgId,
          userId,
          skillId,
          JSON.stringify({ input, result_preview: JSON.stringify(result).substring(0, 200) })
        ])

        return { success: true, result }
      } catch (error) {
        await client.query(`
          INSERT INTO audit (actor_id, action, target, result, meta_json)
          VALUES ($1, 'skill_execute', $2, 'failure', $3)
        `, [
          userId,
          skillId,
          JSON.stringify({ error: (error as Error).message, input })
        ])

        return { success: false, error: (error as Error).message }
      }
    })
  }

  /**
   * Built-in skills implementation
   */
  private static async executeBuiltInSkill(
    skillName: string,
    input: Record<string, any>,
    orgId: string,
    userId: string
  ): Promise<any> {
    switch (skillName) {
      case 'osha-compliance-check':
        return await this.oshaComplianceCheck(input.text, orgId)
      
      case 'contract-clause-extractor':
        return await this.contractClauseExtractor(input.document, input.clause_types)
      
      case 'project-timeline-analyzer':
        return await this.projectTimelineAnalyzer(input.project_data, orgId, userId)
      
      case 'document-summarizer':
        return await this.documentSummarizer(input.document_id, orgId, userId)
      
      default:
        throw new Error(`Unknown built-in skill: ${skillName}`)
    }
  }

  /**
   * Execute external skill via API
   */
  private static async executeExternalSkill(
    manifest: SkillManifest,
    configuration: Record<string, any>,
    input: Record<string, any>
  ): Promise<any> {
    if (!manifest.api_endpoint) {
      throw new Error('No API endpoint configured for external skill')
    }

    const response = await fetch(manifest.api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': configuration.api_key ? `Bearer ${configuration.api_key}` : undefined,
        ...configuration.headers
      },
      body: JSON.stringify({
        input,
        configuration,
        version: manifest.version
      })
    })

    if (!response.ok) {
      throw new Error(`Skill API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Built-in skill: OSHA Compliance Check
   */
  private static async oshaComplianceCheck(text: string, orgId: string): Promise<any> {
    // Simplified OSHA compliance patterns
    const compliancePatterns = [
      { pattern: /fall protection/gi, requirement: 'Fall Protection (29 CFR 1926.501)', critical: true },
      { pattern: /hard hat|helmet/gi, requirement: 'Head Protection (29 CFR 1926.95)', critical: true },
      { pattern: /safety glasses|eye protection/gi, requirement: 'Eye Protection (29 CFR 1926.102)', critical: true },
      { pattern: /lockout.*tagout|loto/gi, requirement: 'Lockout/Tagout (29 CFR 1910.147)', critical: true },
      { pattern: /confined space/gi, requirement: 'Confined Space (29 CFR 1926.1200)', critical: true }
    ]

    const findings = []
    const violations = []

    for (const pattern of compliancePatterns) {
      const matches = text.match(pattern.pattern)
      if (matches) {
        findings.push({
          requirement: pattern.requirement,
          matches: matches.length,
          critical: pattern.critical,
          matched_text: matches.slice(0, 3) // First 3 matches
        })
      } else if (pattern.critical && text.length > 500) {
        // If it's a critical requirement and substantial text, flag as potential violation
        violations.push({
          requirement: pattern.requirement,
          issue: 'No evidence of compliance found in document'
        })
      }
    }

    return {
      compliance_score: Math.max(0, 1 - (violations.length * 0.2)),
      findings,
      violations,
      recommendations: violations.map(v => `Review and ensure compliance with ${v.requirement}`)
    }
  }

  /**
   * Built-in skill: Contract Clause Extractor
   */
  private static async contractClauseExtractor(
    documentText: string,
    clauseTypes: string[] = ['payment', 'termination', 'liability', 'warranty']
  ): Promise<any> {
    const clauses = []

    const patterns: Record<string, RegExp[]> = {
      payment: [
        /payment.*(?:due|within|terms).*?(?:\.|;|\n)/gi,
        /invoice.*(?:submit|pay|due).*?(?:\.|;|\n)/gi,
        /compensation.*amount.*?(?:\.|;|\n)/gi
      ],
      termination: [
        /terminat.*(?:notice|period|cause).*?(?:\.|;|\n)/gi,
        /end.*agreement.*?(?:\.|;|\n)/gi,
        /breach.*terminat.*?(?:\.|;|\n)/gi
      ],
      liability: [
        /liabilit.*(?:limit|exclude|maximum).*?(?:\.|;|\n)/gi,
        /indemnif.*(?:hold harmless|protect).*?(?:\.|;|\n)/gi,
        /damages.*(?:consequential|indirect|punitive).*?(?:\.|;|\n)/gi
      ],
      warranty: [
        /warrant.*(?:express|implied|fitness).*?(?:\.|;|\n)/gi,
        /guarantee.*(?:quality|performance).*?(?:\.|;|\n)/gi,
        /disclaim.*warrant.*?(?:\.|;|\n)/gi
      ]
    }

    for (const clauseType of clauseTypes) {
      if (patterns[clauseType]) {
        for (const pattern of patterns[clauseType]) {
          const matches = documentText.match(pattern)
          if (matches) {
            clauses.push({
              type: clauseType,
              text: matches[0].trim(),
              confidence: 0.8,
              location: documentText.indexOf(matches[0])
            })
          }
        }
      }
    }

    return {
      extracted_clauses: clauses,
      clause_types_found: Array.from(new Set(clauses.map(c => c.type))),
      total_clauses: clauses.length,
      summary: clauses.reduce((acc, clause) => {
        acc[clause.type] = (acc[clause.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  /**
   * Built-in skill: Project Timeline Analyzer
   */
  private static async projectTimelineAnalyzer(
    projectData: any,
    orgId: string,
    userId: string
  ): Promise<any> {
    // Analyze project timeline and identify risks
    const analysis = {
      critical_path: [] as any[],
      risks: [] as Array<{
        type: string;
        count: number;
        severity: string;
        description: string;
      }>,
      recommendations: [] as any[],
      timeline_health: 'good' as 'good' | 'warning' | 'critical'
    }

    // Simplified timeline analysis
    if (projectData.tasks) {
      const now = new Date()
      const overdueTasks = projectData.tasks.filter((task: any) => 
        new Date(task.due_date) < now && task.status !== 'completed'
      )

      const upcomingDeadlines = projectData.tasks.filter((task: any) => {
        const dueDate = new Date(task.due_date)
        const daysDiff = (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24)
        return daysDiff > 0 && daysDiff <= 7 && task.status !== 'completed'
      })

      if (overdueTasks.length > 0) {
        analysis.timeline_health = 'critical'
        analysis.risks.push({
          type: 'overdue_tasks',
          count: overdueTasks.length,
          severity: 'high',
          description: `${overdueTasks.length} tasks are overdue`
        })
      }

      if (upcomingDeadlines.length > 3) {
        analysis.timeline_health = analysis.timeline_health === 'critical' ? 'critical' : 'warning'
        analysis.risks.push({
          type: 'upcoming_deadlines',
          count: upcomingDeadlines.length,
          severity: 'medium',
          description: `${upcomingDeadlines.length} tasks due within 7 days`
        })
      }

      analysis.recommendations = [
        ...overdueTasks.map((task: any) => `Prioritize overdue task: ${task.title}`),
        ...upcomingDeadlines.slice(0, 3).map((task: any) => `Review upcoming deadline: ${task.title}`)
      ]
    }

    return analysis
  }

  /**
   * Built-in skill: Document Summarizer
   */
  private static async documentSummarizer(
    documentId: string,
    orgId: string,
    userId: string
  ): Promise<any> {
    // This would integrate with the existing document system
    // For now, return a placeholder structure
    return {
      summary: 'Document summary would be generated here using AI',
      key_points: [
        'Key point 1',
        'Key point 2',
        'Key point 3'
      ],
      word_count: 0,
      reading_time_minutes: 0,
      topics: [],
      sentiment: 'neutral' as 'positive' | 'neutral' | 'negative'
    }
  }

  /**
   * Helper methods
   */
  private static validateConfiguration(
    config: Record<string, any>,
    schema: Record<string, any>
  ): {valid: boolean, errors: string[]} {
    // Simplified validation - in production use a proper JSON schema validator
    const errors: string[] = []
    
    for (const [key, schemaValue] of Object.entries(schema)) {
      if (schemaValue.required && !(key in config)) {
        errors.push(`Missing required field: ${key}`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  private static getMaxSkillsForPlan(plan: string): number {
    switch (plan) {
      case 'free': return 2
      case 'pro': return 10
      case 'team': return 20
      case 'enterprise': return 100
      default: return 2
    }
  }

  /**
   * Get installed skills for an organization
   */
  static async getInstalledSkills(
    orgId: string,
    userId: string
  ): Promise<Array<{skill: Skill, configuration: Record<string, any>, status: string}>> {
    return await withOrgContext(orgId, userId, async (client) => {
      const result = await client.query(`
        SELECT s.*, os.configuration, os.status as installation_status
        FROM org_skills os
        JOIN skills s ON os.skill_id = s.id
        WHERE os.org_id = $1
        ORDER BY os.installed_at DESC
      `, [orgId])

      return result.rows.map((row: any) => ({
        skill: {
          id: row.id,
          name: row.name,
          description: row.description,
          category: row.category,
          author: row.author,
          version: row.version,
          manifest_json: row.manifest_json,
          installation_count: row.installation_count,
          rating: row.rating,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at
        },
        configuration: row.configuration,
        status: row.installation_status
      }))
    })
  }
}