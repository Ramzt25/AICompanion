-- Advanced features schema extensions

-- Enhanced organization plans with usage limits
ALTER TABLE orgs ADD COLUMN storage_limit_mb INTEGER DEFAULT 100; -- Free tier: 100MB
ALTER TABLE orgs ADD COLUMN monthly_queries INTEGER DEFAULT 0;
ALTER TABLE orgs ADD COLUMN monthly_query_limit INTEGER DEFAULT 100; -- Free tier: 100 queries/month
ALTER TABLE orgs ADD COLUMN ai_credits INTEGER DEFAULT 100; -- Premium assistance credits
ALTER TABLE orgs ADD COLUMN features_json JSONB DEFAULT '{}'; -- Feature flags per plan

-- Update plan enum to include new tiers
ALTER TABLE orgs DROP CONSTRAINT orgs_plan_check;
ALTER TABLE orgs ADD CONSTRAINT orgs_plan_check CHECK (plan IN ('free', 'pro', 'team', 'enterprise'));

-- Contextual awareness tracking
CREATE TABLE page_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL, -- 'chat', 'sources', 'automations', 'memory', 'analytics'
  context_data JSONB DEFAULT '{}', -- Current page state, filters, etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge graph entities
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'person', 'project', 'spec', 'deadline', 'document', 'task'
  name TEXT NOT NULL,
  description TEXT,
  properties JSONB DEFAULT '{}',
  embedding VECTOR(3072), -- For semantic entity search
  confidence DECIMAL(3,2) DEFAULT 0.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge graph relationships
CREATE TABLE entity_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'works_on', 'deadline_for', 'references', 'depends_on'
  weight DECIMAL(3,2) DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback system for learning relevance
CREATE TABLE answer_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  citations JSONB NOT NULL, -- Array of citation objects
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('good', 'bad', 'irrelevant', 'helpful')),
  feedback_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skills marketplace
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'compliance', 'extraction', 'analysis', 'automation'
  author TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  manifest_json JSONB NOT NULL, -- Skills configuration and API spec
  installation_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0.0,
  status TEXT NOT NULL CHECK (status IN ('active', 'deprecated', 'under_review')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Installed skills per organization
CREATE TABLE org_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  configuration JSONB DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')) DEFAULT 'active',
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, skill_id)
);

-- Multi-modal document processing
CREATE TABLE document_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- 'image', 'cad', 'scan', 'video', 'audio'
  file_path TEXT NOT NULL,
  processed_text TEXT, -- OCR or extracted text
  embedding VECTOR(3072), -- For visual similarity search
  processing_status TEXT NOT NULL CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  meta_json JSONB DEFAULT '{}', -- File size, dimensions, etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team analytics and usage tracking
CREATE TABLE usage_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metric_type TEXT NOT NULL, -- 'query', 'document_view', 'automation_run', 'skill_use'
  metric_value DECIMAL(10,2) DEFAULT 1.0,
  resource_id UUID, -- Document, automation, or skill ID
  meta_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscription and billing
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL, -- 'free', 'pro_individual', 'team', 'enterprise'
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid')) DEFAULT 'active',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  billing_email TEXT,
  payment_method_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Thread and conversation management
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  title TEXT,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  tool_calls JSONB DEFAULT '[]',
  feedback_id UUID REFERENCES answer_feedback(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_page_contexts_user_page ON page_contexts(user_id, page_type);
CREATE INDEX idx_entities_org_type ON entities(org_id, type);
CREATE INDEX idx_entities_embedding ON entities USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_entity_relationships_source ON entity_relationships(source_entity_id);
CREATE INDEX idx_entity_relationships_target ON entity_relationships(target_entity_id);
CREATE INDEX idx_answer_feedback_org_feedback ON answer_feedback(org_id, feedback_type);
CREATE INDEX idx_skills_category_status ON skills(category, status);
CREATE INDEX idx_org_skills_org_status ON org_skills(org_id, status);
CREATE INDEX idx_document_assets_doc_type ON document_assets(document_id, asset_type);
CREATE INDEX idx_document_assets_embedding ON document_assets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_usage_analytics_org_metric ON usage_analytics(org_id, metric_type, created_at);
CREATE INDEX idx_threads_user_org ON threads(user_id, org_id);
CREATE INDEX idx_messages_thread ON messages(thread_id, created_at);