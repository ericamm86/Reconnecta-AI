create extension if not exists "uuid-ossp";

create table if not exists app_users (
  id text primary key,
  email text not null unique,
  role text not null default 'standard' check (role in ('standard', 'admin')),
  plan text not null default 'standard',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id text primary key,
  email text not null unique,
  display_name text,
  avatar_url text,
  provider text not null default 'email',
  is_public boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references profiles(id) on delete cascade,
  provider text not null,
  user_agent text,
  ip_hash text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  owner_id text not null default 'demo-user',
  name text not null,
  avatar_url text,
  description text,
  email text,
  emails text[] not null default '{}',
  phones text[] not null default '{}',
  derived_ddd text,
  company text,
  role text,
  area text,
  proximity integer not null default 50,
  tags text[] not null default '{}',
  source_origin text not null default 'manual',
  social_links jsonb not null default '{}',
  current_demand text,
  problem_solved text,
  internal_notes text not null default '',
  record_scopes text[] not null default '{INTERNAL_PRIVATE}',
  linked_user_id text references profiles(id) on delete set null,
  custom_values jsonb not null default '{}',
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table contacts add column if not exists avatar_url text;
alter table contacts add column if not exists description text;
alter table contacts add column if not exists emails text[] not null default '{}';
alter table contacts add column if not exists phones text[] not null default '{}';
alter table contacts add column if not exists derived_ddd text;
alter table contacts add column if not exists source_origin text not null default 'manual';
alter table contacts add column if not exists social_links jsonb not null default '{}';
alter table contacts add column if not exists current_demand text;
alter table contacts add column if not exists problem_solved text;
alter table contacts add column if not exists internal_notes text not null default '';
alter table contacts add column if not exists record_scopes text[] not null default '{INTERNAL_PRIVATE}';
alter table contacts add column if not exists linked_user_id text references profiles(id) on delete set null;
alter table contacts add column if not exists custom_values jsonb not null default '{}';

create table if not exists tags (
  id uuid primary key default uuid_generate_v4(),
  owner_id text,
  group_id uuid,
  label text not null,
  slug text not null,
  color text not null default '#49d6a8',
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, group_id, slug)
);

create table if not exists contact_tags (
  contact_id uuid not null references contacts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create table if not exists custom_fields (
  id uuid primary key default uuid_generate_v4(),
  owner_id text,
  group_id uuid,
  scope text not null check (scope in ('user', 'group')),
  key text not null,
  label text not null,
  type text not null default 'short_text' check (type in ('short_text', 'long_text', 'number', 'select', 'checkbox', 'multiselect', 'date')),
  options jsonb not null default '[]',
  required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, group_id, key)
);

create table if not exists custom_field_values (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  value jsonb not null default 'null',
  updated_at timestamptz not null default now(),
  unique (contact_id, custom_field_id)
);

create table if not exists contact_import_jobs (
  id uuid primary key default uuid_generate_v4(),
  owner_id text not null,
  source text not null check (source in ('google_contacts', 'csv', 'manual', 'apple_contacts', 'outlook', 'linkedin_export', 'other')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  duplicate_candidates integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists ignored_duplicate_pairs (
  id uuid primary key default uuid_generate_v4(),
  owner_id text not null,
  left_contact_id uuid not null references contacts(id) on delete cascade,
  right_contact_id uuid not null references contacts(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (owner_id, left_contact_id, right_contact_id)
);

create table if not exists contact_edges (
  id uuid primary key default uuid_generate_v4(),
  owner_id text not null,
  source_contact_id uuid not null references contacts(id) on delete cascade,
  target_contact_id uuid not null references contacts(id) on delete cascade,
  relationship_type text not null default 'known_connection',
  strength integer not null default 50 check (strength between 0 and 100),
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, source_contact_id, target_contact_id)
);

create table if not exists interactions (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  type text not null default 'note',
  occurred_at timestamptz not null default now(),
  summary text not null,
  notes_markdown text not null default '',
  sentiment text not null default 'neutral',
  created_at timestamptz not null default now()
);

create table if not exists intelligence_snapshots (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  relationship_score integer not null default 0,
  next_action text not null,
  follow_up text not null,
  message text not null,
  summary text not null,
  insights jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public_profiles (
  id uuid primary key default uuid_generate_v4(),
  owner_id text not null unique,
  is_active boolean not null default false,
  display_name text not null,
  headline text,
  bio text,
  company text,
  location text,
  tags text[] not null default '{}',
  visibility text not null default 'network' check (visibility in ('hidden', 'network', 'public')),
  updated_at timestamptz not null default now()
);

create table if not exists shared_groups (
  id uuid primary key default uuid_generate_v4(),
  owner_id text not null,
  name text not null,
  description text,
  visibility text not null default 'private' check (visibility in ('private', 'invite_only', 'organization')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references shared_groups(id) on delete cascade,
  user_id text,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (group_id, email)
);

create table if not exists group_custom_fields (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references shared_groups(id) on delete cascade,
  key text not null,
  label text not null,
  type text not null default 'text' check (type in ('text', 'number', 'date', 'select', 'boolean')),
  options jsonb not null default '[]',
  required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (group_id, key)
);

create table if not exists group_contact_refs (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references shared_groups(id) on delete cascade,
  owner_id text not null,
  contact_id uuid not null references contacts(id) on delete cascade,
  shared_fields jsonb not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  unique (group_id, owner_id, contact_id)
);

create index if not exists contacts_owner_id_idx on contacts(owner_id);
create index if not exists contacts_derived_ddd_idx on contacts(owner_id, derived_ddd);
create index if not exists contacts_emails_gin_idx on contacts using gin(emails);
create index if not exists contacts_phones_gin_idx on contacts using gin(phones);
create index if not exists contacts_record_scopes_gin_idx on contacts using gin(record_scopes);
create index if not exists contact_edges_owner_id_idx on contact_edges(owner_id);
create index if not exists tags_owner_slug_idx on tags(owner_id, slug);
create index if not exists custom_fields_scope_idx on custom_fields(owner_id, group_id, scope);
create index if not exists public_profiles_active_idx on public_profiles(is_active, visibility);
create index if not exists shared_groups_owner_id_idx on shared_groups(owner_id);
create index if not exists group_members_user_id_idx on group_members(user_id);
create index if not exists auth_sessions_user_id_idx on auth_sessions(user_id);
create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

create or replace function initialize_profile_from_supabase_auth()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url, provider, is_public)
  values (
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    false
  )
  on conflict (id) do nothing;

  insert into public.app_users (id, email, role, plan)
  values (new.id::text, new.email, 'standard', 'standard')
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

do $$
begin
  if to_regclass('auth.users') is not null and not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created_initialize_profile'
  ) then
    create trigger on_auth_user_created_initialize_profile
      after insert on auth.users
      for each row execute function initialize_profile_from_supabase_auth();
  end if;
end $$;
