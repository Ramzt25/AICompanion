import { z } from 'zod'

// Core entity schemas
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  org_id: z.string(),
  role: z.enum(['admin', 'member', 'viewer']),
  settings_json: z.record(z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date()
})

export const OrgSchema = z.object({
  id: z.string(),
  name: z.string(),
  plan: z.enum(['free', 'pro', 'team', 'enterprise']),
  policies_json: z.record(z.any()).optional(),
  storage_limit_mb: z.number().optional(),
  monthly_queries: z.number().optional(),
  monthly_query_limit: z.number().optional(),
  ai_credits: z.number().optional(),
  features_json: z.record(z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date()
})

export const SourceSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  type: z.enum(['google_drive', 'github', 'slack', 'email', 'web']),
  display_name: z.string(),
  auth_scope_json: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive', 'error']),
  created_at: z.date(),
  updated_at: z.date()
})

export const DocumentSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  uri: z.string(),
  title: z.string(),
  hash: z.string(),
  meta_json: z.record(z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date()
})

export const ChunkSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  text: z.string(),
  token_count: z.number(),
  embedding: z.array(z.number()).optional(),
  meta_json: z.record(z.any()).optional(),
  created_at: z.date()
})

export const MemorySchema = z.object({
  id: z.string(),
  subject_type: z.enum(['user', 'org', 'project']),
  subject_id: z.string(),
  kind: z.enum(['preference', 'fact', 'context']),
  content: z.string(),
  confidence: z.number().min(0).max(1),
  expires_at: z.date().optional(),
  created_at: z.date(),
  updated_at: z.date()
})

export const AutomationSchema = z.object({
  id: z.string(),
  owner_id: z.string(),
  org_id: z.string(),
  prompt: z.string(),
  schedule: z.string(), // RRULE format
  status: z.enum(['active', 'paused', 'error']),
  last_run_at: z.date().optional(),
  created_at: z.date(),
  updated_at: z.date()
})

export const AuditSchema = z.object({
  id: z.string(),
  actor_id: z.string(),
  action: z.string(),
  target: z.string(),
  result: z.enum(['success', 'failure', 'partial']),
  meta_json: z.record(z.any()).optional(),
  created_at: z.date()
})

// API schemas
export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  thread_id: z.string().optional(),
  tools_allowed: z.array(z.string()).optional(),
  org_id: z.string()
})

export const CitationSchema = z.object({
  doc_id: z.string(),
  chunk_id: z.string(),
  uri: z.string(),
  title: z.string(),
  span: z.string(),
  score: z.number().optional()
})

export const ToolCallSchema = z.object({
  id: z.string(),
  tool: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  input: z.record(z.any()),
  output: z.record(z.any()).optional(),
  error: z.string().optional()
})

export const ChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
  tool_calls: z.array(ToolCallSchema),
  messages: z.array(z.record(z.any()))
})

export const IngestRequestSchema = z.object({
  source_id: z.string(),
  full_resync: z.boolean().optional().default(false)
})

export const AutomationRequestSchema = z.object({
  prompt: z.string().min(1),
  schedule: z.string(), // RRULE format
  scopes: z.array(z.string()).optional()
})

// Type exports
export type User = z.infer<typeof UserSchema>
export type Org = z.infer<typeof OrgSchema>
export type Source = z.infer<typeof SourceSchema>
export type Document = z.infer<typeof DocumentSchema>
export type Chunk = z.infer<typeof ChunkSchema>
export type Memory = z.infer<typeof MemorySchema>
export type Automation = z.infer<typeof AutomationSchema>
export type Audit = z.infer<typeof AuditSchema>

export type ChatRequest = z.infer<typeof ChatRequestSchema>
export type ChatResponse = z.infer<typeof ChatResponseSchema>
export type Citation = z.infer<typeof CitationSchema>
export type ToolCall = z.infer<typeof ToolCallSchema>
export type IngestRequest = z.infer<typeof IngestRequestSchema>
export type AutomationRequest = z.infer<typeof AutomationRequestSchema>

// Advanced features schemas
export const EntitySchema = z.object({
  id: z.string(),
  org_id: z.string(),
  type: z.enum(['person', 'project', 'spec', 'deadline', 'document', 'task']),
  name: z.string(),
  description: z.string().optional(),
  properties: z.record(z.any()).optional(),
  embedding: z.array(z.number()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  created_at: z.date(),
  updated_at: z.date()
})

export const EntityRelationshipSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  source_entity_id: z.string(),
  target_entity_id: z.string(),
  relationship_type: z.enum(['works_on', 'deadline_for', 'references', 'depends_on']),
  weight: z.number().min(0).max(1).optional(),
  properties: z.record(z.any()).optional(),
  created_at: z.date()
})

export const FeedbackSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  org_id: z.string(),
  question: z.string(),
  answer: z.string(),
  citations: z.array(CitationSchema),
  feedback_type: z.enum(['good', 'bad', 'irrelevant', 'helpful']),
  feedback_details: z.string().optional(),
  created_at: z.date()
})

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['compliance', 'extraction', 'analysis', 'automation']),
  author: z.string(),
  version: z.string(),
  manifest_json: z.record(z.any()),
  installation_count: z.number().optional(),
  rating: z.number().min(0).max(5).optional(),
  status: z.enum(['active', 'deprecated', 'under_review']),
  created_at: z.date(),
  updated_at: z.date()
})

export const ThreadSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  org_id: z.string(),
  title: z.string().optional(),
  context_data: z.record(z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date()
})

export const MessageSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  citations: z.array(CitationSchema).optional(),
  tool_calls: z.array(ToolCallSchema).optional(),
  feedback_id: z.string().optional(),
  created_at: z.date()
})

export const PageContextSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  page_type: z.enum(['chat', 'sources', 'automations', 'memory', 'analytics']),
  context_data: z.record(z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date()
})

export const UsageAnalyticsSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  user_id: z.string().optional(),
  metric_type: z.enum(['query', 'document_view', 'automation_run', 'skill_use']),
  metric_value: z.number().optional(),
  resource_id: z.string().optional(),
  meta_json: z.record(z.any()).optional(),
  created_at: z.date()
})

// Advanced API schemas
export const EntityQuerySchema = z.object({
  org_id: z.string(),
  query: z.string().optional(),
  entity_types: z.array(z.string()).optional(),
  limit: z.number().min(1).max(50).optional().default(10)
})

export const FeedbackRequestSchema = z.object({
  question: z.string(),
  answer: z.string(),
  citations: z.array(CitationSchema),
  feedback_type: z.enum(['good', 'bad', 'irrelevant', 'helpful']),
  feedback_details: z.string().optional()
})

export const SkillInstallRequestSchema = z.object({
  skill_id: z.string(),
  configuration: z.record(z.any()).optional()
})

export const ContextualSuggestionSchema = z.object({
  type: z.enum(['action', 'query', 'document', 'automation']),
  title: z.string(),
  description: z.string(),
  action: z.string(), // API endpoint or action identifier
  confidence: z.number().min(0).max(1),
  context_data: z.record(z.any()).optional()
})

// Advanced type exports
export type Entity = z.infer<typeof EntitySchema>
export type EntityRelationship = z.infer<typeof EntityRelationshipSchema>
export type Feedback = z.infer<typeof FeedbackSchema>
export type Skill = z.infer<typeof SkillSchema>
export type Thread = z.infer<typeof ThreadSchema>
export type Message = z.infer<typeof MessageSchema>
export type PageContext = z.infer<typeof PageContextSchema>
export type UsageAnalytics = z.infer<typeof UsageAnalyticsSchema>
export type EntityQuery = z.infer<typeof EntityQuerySchema>
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>
export type SkillInstallRequest = z.infer<typeof SkillInstallRequestSchema>
export type ContextualSuggestion = z.infer<typeof ContextualSuggestionSchema>