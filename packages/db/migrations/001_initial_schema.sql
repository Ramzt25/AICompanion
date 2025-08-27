-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- Create organizations table
create table orgs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  plan text not null check (plan in ('free', 'pro', 'enterprise')),
  policies_json jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create users table  
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  name text not null,
  org_id uuid not null references orgs(id) on delete cascade,
  role text not null check (role in ('admin', 'member', 'viewer')),
  settings_json jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create sources table
create table sources (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references orgs(id) on delete cascade,
  type text not null check (type in ('google_drive', 'github', 'slack', 'email', 'web')),
  display_name text not null,
  auth_scope_json jsonb default '{}',
  status text not null check (status in ('active', 'inactive', 'error')) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create documents table
create table documents (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references sources(id) on delete cascade,
  uri text not null,
  title text not null,
  hash text not null,
  meta_json jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id, uri)
);

-- Create chunks table with vector embeddings
create table chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references documents(id) on delete cascade,
  text text not null,
  token_count integer not null,
  embedding vector(3072),
  meta_json jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Create memories table
create table memories (
  id uuid primary key default uuid_generate_v4(),
  subject_type text not null check (subject_type in ('user', 'org', 'project')),
  subject_id uuid not null,
  kind text not null check (kind in ('preference', 'fact', 'context')),
  content text not null,
  confidence decimal(3,2) not null check (confidence >= 0 and confidence <= 1),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create automations table
create table automations (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  prompt text not null,
  schedule text not null, -- RRULE format
  status text not null check (status in ('active', 'paused', 'error')) default 'active',
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create audit table
create table audit (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid not null references users(id),
  action text not null,
  target text not null,
  result text not null check (result in ('success', 'failure', 'partial')),
  meta_json jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Create indexes for performance
create index idx_users_org_id on users(org_id);
create index idx_users_email on users(email);
create index idx_sources_org_id on sources(org_id);
create index idx_documents_source_id on documents(source_id);
create index idx_documents_hash on documents(hash);
create index idx_chunks_document_id on chunks(document_id);
create index idx_chunks_embedding on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_memories_subject on memories(subject_type, subject_id);
create index idx_automations_org_id on automations(org_id);
create index idx_automations_owner_id on automations(owner_id);
create index idx_audit_actor_id on audit(actor_id);
create index idx_audit_created_at on audit(created_at);

-- Add updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

-- Add triggers for updated_at
create trigger update_orgs_updated_at before update on orgs
  for each row execute function update_updated_at_column();
create trigger update_users_updated_at before update on users  
  for each row execute function update_updated_at_column();
create trigger update_sources_updated_at before update on sources
  for each row execute function update_updated_at_column();
create trigger update_documents_updated_at before update on documents
  for each row execute function update_updated_at_column();
create trigger update_memories_updated_at before update on memories
  for each row execute function update_updated_at_column();
create trigger update_automations_updated_at before update on automations
  for each row execute function update_updated_at_column();