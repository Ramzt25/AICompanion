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
  plan: z.enum(['free', 'pro', 'enterprise']),
  policies_json: z.record(z.any()).optional(),
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