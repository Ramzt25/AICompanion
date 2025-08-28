-- Add tables for feedback learning and individual user analytics
-- This migration supports the feedback learning system and user learning analytics

-- Create feedback table for user feedback on AI responses
create table if not exists feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  query_text text not null,
  response_text text not null,
  feedback_type text not null check (feedback_type in ('helpful', 'not_helpful', 'inaccurate', 'incomplete', 'inappropriate')),
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  citations jsonb default '[]',
  context jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Create user learning analytics table
create table if not exists user_learning_analytics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  date date not null,
  queries_count integer default 0,
  positive_feedback_count integer default 0,
  negative_feedback_count integer default 0,
  avg_response_time_ms integer default 0,
  top_topics jsonb default '[]',
  knowledge_gaps jsonb default '[]',
  learning_progress_score decimal(5,2) default 0,
  engagement_score decimal(5,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Create query analytics table for tracking query patterns
create table if not exists query_analytics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  query_text text not null,
  query_embedding vector(3072),
  response_time_ms integer not null,
  success boolean default true,
  error_message text,
  sources_used jsonb default '[]',
  confidence_score decimal(3,2),
  created_at timestamptz not null default now()
);

-- Create knowledge gaps table for tracking user learning needs
create table if not exists knowledge_gaps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  topic text not null,
  gap_type text not null check (gap_type in ('missing_knowledge', 'outdated_info', 'unclear_concept', 'tool_usage')),
  frequency integer default 1,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  identified_from jsonb default '{}',
  suggested_resources jsonb default '[]',
  status text not null check (status in ('identified', 'learning', 'resolved', 'ignored')) default 'identified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, topic)
);

-- Create learning sessions table for tracking user learning progress
create table if not exists learning_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  session_start timestamptz not null default now(),
  session_end timestamptz,
  queries_count integer default 0,
  topics_explored jsonb default '[]',
  documents_accessed jsonb default '[]',
  feedback_given integer default 0,
  learning_objectives jsonb default '[]',
  completion_score decimal(3,2),
  created_at timestamptz not null default now()
);

-- Add indexes for performance
create index if not exists idx_feedback_user_id on feedback(user_id);
create index if not exists idx_feedback_org_id on feedback(org_id);
create index if not exists idx_feedback_created_at on feedback(created_at);
create index if not exists idx_feedback_type on feedback(feedback_type);

create index if not exists idx_user_learning_analytics_user_id on user_learning_analytics(user_id);
create index if not exists idx_user_learning_analytics_org_id on user_learning_analytics(org_id);
create index if not exists idx_user_learning_analytics_date on user_learning_analytics(date);

create index if not exists idx_query_analytics_user_id on query_analytics(user_id);
create index if not exists idx_query_analytics_org_id on query_analytics(org_id);
create index if not exists idx_query_analytics_created_at on query_analytics(created_at);
-- create index if not exists idx_query_analytics_embedding on query_analytics using ivfflat (query_embedding vector_cosine_ops) with (lists = 50);

create index if not exists idx_knowledge_gaps_user_id on knowledge_gaps(user_id);
create index if not exists idx_knowledge_gaps_org_id on knowledge_gaps(org_id);
create index if not exists idx_knowledge_gaps_status on knowledge_gaps(status);
create index if not exists idx_knowledge_gaps_topic on knowledge_gaps(topic);

create index if not exists idx_learning_sessions_user_id on learning_sessions(user_id);
create index if not exists idx_learning_sessions_org_id on learning_sessions(org_id);
create index if not exists idx_learning_sessions_start on learning_sessions(session_start);

-- Add triggers for updated_at
create trigger update_user_learning_analytics_updated_at before update on user_learning_analytics
  for each row execute function update_updated_at_column();

create trigger update_knowledge_gaps_updated_at before update on knowledge_gaps
  for each row execute function update_updated_at_column();
