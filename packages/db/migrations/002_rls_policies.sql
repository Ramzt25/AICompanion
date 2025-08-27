-- Enable Row-Level Security on all tenant tables
alter table orgs enable row level security;
alter table users enable row level security;
alter table sources enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
alter table memories enable row level security;
alter table automations enable row level security;
alter table audit enable row level security;

-- RLS policies for organization isolation
create policy org_isolation_orgs on orgs
  using (id = (current_setting('app.org_id', true))::uuid);

create policy org_isolation_users on users
  using (org_id = (current_setting('app.org_id', true))::uuid);

create policy org_isolation_sources on sources
  using (org_id = (current_setting('app.org_id', true))::uuid);

create policy org_isolation_documents on documents
  using (exists (
    select 1 from sources s 
    where s.id = documents.source_id 
    and s.org_id = (current_setting('app.org_id', true))::uuid
  ));

create policy org_isolation_chunks on chunks
  using (exists (
    select 1 from documents d
    join sources s on s.id = d.source_id
    where d.id = chunks.document_id
    and s.org_id = (current_setting('app.org_id', true))::uuid
  ));

create policy org_isolation_memories on memories
  using (
    case memories.subject_type
      when 'org' then subject_id = (current_setting('app.org_id', true))::uuid
      when 'user' then exists (
        select 1 from users u 
        where u.id = memories.subject_id 
        and u.org_id = (current_setting('app.org_id', true))::uuid
      )
      else true -- project-level handled by application logic
    end
  );

create policy org_isolation_automations on automations
  using (org_id = (current_setting('app.org_id', true))::uuid);

create policy org_isolation_audit on audit
  using (exists (
    select 1 from users u
    where u.id = audit.actor_id
    and u.org_id = (current_setting('app.org_id', true))::uuid
  ));

-- Owner-level policies for user-specific data
create policy user_isolation_memories on memories
  using (
    subject_type = 'user' 
    and subject_id = (current_setting('app.user_id', true))::uuid
  );

create policy user_isolation_automations on automations
  using (owner_id = (current_setting('app.user_id', true))::uuid);

-- Grant permissions to application role
grant usage on schema public to ai_companion_app;
grant select, insert, update, delete on all tables in schema public to ai_companion_app;
grant usage, select on all sequences in schema public to ai_companion_app;