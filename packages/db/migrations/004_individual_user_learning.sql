-- Individual User Learning and Adaptation Schema
-- This enables the AI to learn from individual user behavior patterns and adapt accordingly

-- User behavior patterns and learning profiles
CREATE TABLE user_learning_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Core user behavior characteristics
  primary_role TEXT, -- auto-detected: 'manager', 'engineer', 'analyst', 'legal', 'sales', etc.
  work_patterns JSONB DEFAULT '{}', -- time preferences, document types, query patterns
  expertise_areas JSONB DEFAULT '[]', -- topics user is knowledgeable about
  learning_preferences JSONB DEFAULT '{}', -- response style, detail level, citation preferences
  
  -- Interaction patterns
  avg_query_complexity DECIMAL(3,2) DEFAULT 0.5, -- 0-1 scale
  preferred_response_length TEXT DEFAULT 'medium', -- 'brief', 'medium', 'detailed'
  citation_preference TEXT DEFAULT 'balanced', -- 'minimal', 'balanced', 'comprehensive'
  
  -- Adaptation metrics
  satisfaction_score DECIMAL(3,2) DEFAULT 0.7, -- running average of user satisfaction
  engagement_level DECIMAL(3,2) DEFAULT 0.5, -- based on interaction frequency and feedback
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, org_id)
);

-- Individual user's document interaction history
CREATE TABLE user_document_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Interaction details
  interaction_type TEXT NOT NULL, -- 'query_referenced', 'explicitly_opened', 'feedback_given'
  relevance_score DECIMAL(3,2) DEFAULT 0.5, -- user's personal relevance for this document
  access_frequency INTEGER DEFAULT 1,
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Context when accessed
  context_tags JSONB DEFAULT '[]', -- ['urgent', 'research', 'compliance', etc.]
  query_context TEXT, -- the question that led to this document
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, document_id)
);

-- User's expertise and knowledge contributions
CREATE TABLE user_expertise_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Expertise indicators
  topic_area TEXT NOT NULL, -- 'safety protocols', 'contract law', 'project management'
  expertise_level DECIMAL(3,2) DEFAULT 0.5, -- 0-1 scale, auto-calculated
  confidence_score DECIMAL(3,2) DEFAULT 0.5, -- how confident we are in this assessment
  
  -- Evidence for expertise
  evidence_type TEXT NOT NULL, -- 'feedback_quality', 'document_authoring', 'question_complexity'
  evidence_data JSONB DEFAULT '{}', -- supporting data for the expertise claim
  
  -- Temporal aspects
  recency_weight DECIMAL(3,2) DEFAULT 1.0, -- how recent/relevant this signal is
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User's personalized AI interaction patterns
CREATE TABLE user_ai_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Query characteristics
  query_text TEXT NOT NULL,
  query_category TEXT, -- auto-categorized: 'how-to', 'factual', 'analytical', 'procedural'
  query_complexity DECIMAL(3,2), -- calculated complexity score
  query_embedding VECTOR(3072), -- for finding similar past queries
  
  -- Response adaptation
  response_style TEXT, -- 'technical', 'simplified', 'step-by-step', 'summary'
  detail_level TEXT, -- 'brief', 'standard', 'comprehensive'
  citation_count INTEGER DEFAULT 0,
  
  -- User feedback and learning
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  follow_up_questions INTEGER DEFAULT 0, -- indicates if answer was sufficient
  time_to_feedback INTERVAL, -- how long user took to provide feedback
  
  -- Context
  time_of_day INTEGER, -- hour 0-23
  day_of_week INTEGER, -- 1-7
  urgency_level TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User's personalized search and retrieval preferences
CREATE TABLE user_search_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Search behavior patterns
  preferred_source_types JSONB DEFAULT '[]', -- ['policy', 'procedure', 'manual', 'email']
  source_recency_preference TEXT DEFAULT 'recent', -- 'any', 'recent', 'latest_only'
  authority_preference TEXT DEFAULT 'balanced', -- 'official_only', 'balanced', 'community_input'
  
  -- Result presentation preferences
  max_results_preferred INTEGER DEFAULT 5,
  snippet_length_preference TEXT DEFAULT 'medium', -- 'short', 'medium', 'long'
  visual_content_preference BOOLEAN DEFAULT true,
  
  -- Learned from user behavior
  click_through_patterns JSONB DEFAULT '{}', -- which types of results user typically clicks
  scroll_depth_avg DECIMAL(3,2) DEFAULT 0.5, -- how much of results user typically reads
  
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, org_id)
);

-- Personal knowledge graph for individual users
CREATE TABLE user_personal_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Personal entity tracking
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'person', 'project', 'skill', 'interest', 'responsibility'
  relationship_strength DECIMAL(3,2) DEFAULT 0.5, -- how closely associated with user
  
  -- Context and metadata
  context_data JSONB DEFAULT '{}', -- additional personal context
  frequency_mentioned INTEGER DEFAULT 1,
  last_referenced TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track user's learning journey and skill development
CREATE TABLE user_learning_journey (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  
  -- Learning progression
  skill_area TEXT NOT NULL,
  proficiency_level DECIMAL(3,2) DEFAULT 0.1, -- 0-1 scale
  learning_velocity DECIMAL(3,2) DEFAULT 0.1, -- how quickly user is learning
  
  -- Evidence of learning
  milestone_events JSONB DEFAULT '[]', -- key learning moments
  question_sophistication_trend DECIMAL(3,2) DEFAULT 0.0, -- improving question quality
  
  -- Recommendations
  suggested_resources JSONB DEFAULT '[]', -- personalized learning resources
  next_learning_goals JSONB DEFAULT '[]', -- AI-suggested next steps
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, skill_area)
);

-- Create indexes for efficient queries
CREATE INDEX idx_user_learning_profiles_user ON user_learning_profiles(user_id);
CREATE INDEX idx_user_learning_profiles_org ON user_learning_profiles(org_id);
CREATE INDEX idx_user_document_interactions_user_doc ON user_document_interactions(user_id, document_id);
CREATE INDEX idx_user_document_interactions_relevance ON user_document_interactions(user_id, relevance_score DESC);
CREATE INDEX idx_user_expertise_signals_user_topic ON user_expertise_signals(user_id, topic_area);
CREATE INDEX idx_user_expertise_signals_level ON user_expertise_signals(expertise_level DESC, confidence_score DESC);
CREATE INDEX idx_user_ai_interactions_user_created ON user_ai_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_ai_interactions_embedding ON user_ai_interactions USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_user_search_preferences_user ON user_search_preferences(user_id);
CREATE INDEX idx_user_personal_entities_user_type ON user_personal_entities(user_id, entity_type);
CREATE INDEX idx_user_learning_journey_user_skill ON user_learning_journey(user_id, skill_area);

-- Row Level Security policies for user data
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_document_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_expertise_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_journey ENABLE ROW LEVEL SECURITY;

-- RLS Policies - users can only access their own data, admins can access org data
CREATE POLICY user_learning_profiles_policy ON user_learning_profiles
  USING (user_id::text = current_setting('app.user_id', true) OR 
         org_id::text = current_setting('app.org_id', true));

CREATE POLICY user_document_interactions_policy ON user_document_interactions
  USING (user_id::text = current_setting('app.user_id', true) OR 
         org_id::text = current_setting('app.org_id', true));

CREATE POLICY user_expertise_signals_policy ON user_expertise_signals
  USING (user_id::text = current_setting('app.user_id', true) OR 
         org_id::text = current_setting('app.org_id', true));

CREATE POLICY user_ai_interactions_policy ON user_ai_interactions
  USING (user_id::text = current_setting('app.user_id', true) OR 
         org_id::text = current_setting('app.org_id', true));

CREATE POLICY user_search_preferences_policy ON user_search_preferences
  USING (user_id::text = current_setting('app.user_id', true) OR 
         org_id::text = current_setting('app.org_id', true));

CREATE POLICY user_personal_entities_policy ON user_personal_entities
  USING (user_id::text = current_setting('app.user_id', true) OR 
         org_id::text = current_setting('app.org_id', true));

CREATE POLICY user_learning_journey_policy ON user_learning_journey
  USING (user_id::text = current_setting('app.user_id', true) OR 
         org_id::text = current_setting('app.org_id', true));