-- Add authentication and session management tables
-- This migration adds password management, sessions, and API keys

-- Add password and auth fields to users table
alter table users add column if not exists password_hash text;
alter table users add column if not exists email_verified boolean default false;
alter table users add column if not exists last_login_at timestamptz;
alter table users add column if not exists failed_login_attempts integer default 0;
alter table users add column if not exists locked_until timestamptz;

-- Create user sessions table
create table if not exists user_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  ip_address inet,
  user_agent text
);

-- Create API keys table for programmatic access
create table if not exists api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  permissions jsonb default '{}',
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- Create password reset tokens table
create table if not exists password_reset_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Create email verification tokens table
create table if not exists email_verification_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Add indexes for performance
create index if not exists idx_user_sessions_user_id on user_sessions(user_id);
create index if not exists idx_user_sessions_token_hash on user_sessions(token_hash);
create index if not exists idx_user_sessions_expires_at on user_sessions(expires_at);
create index if not exists idx_api_keys_user_id on api_keys(user_id);
create index if not exists idx_api_keys_org_id on api_keys(org_id);
create index if not exists idx_api_keys_key_hash on api_keys(key_hash);
create index if not exists idx_password_reset_tokens_user_id on password_reset_tokens(user_id);
create index if not exists idx_password_reset_tokens_token_hash on password_reset_tokens(token_hash);
create index if not exists idx_email_verification_tokens_user_id on email_verification_tokens(user_id);
create index if not exists idx_email_verification_tokens_token_hash on email_verification_tokens(token_hash);

-- Add trigger for updating last_used_at on sessions
create or replace function update_session_last_used()
returns trigger as $$
begin
  new.last_used_at = now();
  return new;
end;
$$ language 'plpgsql';

create trigger update_user_sessions_last_used before update on user_sessions
  for each row execute function update_session_last_used();
