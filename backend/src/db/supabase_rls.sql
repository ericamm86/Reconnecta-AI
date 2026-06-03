-- Supabase/Postgres production schema with strict RLS for private CRM and shared groups.
-- Apply after enabling Supabase Auth. All user-owned rows use auth.uid().

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  is_public boolean not null default false,
  onboarding_step text not null default 'profile',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contact_sources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  type text not null check (type in ('google_contacts', 'csv', 'manual', 'apple_contacts', 'outlook', 'linkedin_export', 'other')),
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  name text not null,
  avatar_url text,
  description text,
  current_demand text,
  problem_solved text,
  internal_notes text,
  derived_ddd text,
  source_id uuid references contact_sources(id) on delete set null,
  linked_user_id uuid references user_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('portuguese', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(problem_solved, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(current_demand, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(description, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(internal_notes, '')), 'D')
  ) stored
);

create table if not exists contact_emails (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  email text not null,
  is_primary boolean not null default false,
  unique (contact_id, email)
);

create table if not exists contact_phones (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  phone text not null,
  derived_ddd text,
  is_primary boolean not null default false,
  unique (contact_id, phone)
);

create table if not exists contact_links (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  type text not null check (type in ('linkedin', 'instagram', 'whatsapp', 'custom')),
  url text not null,
  unique (contact_id, type, url)
);

create table if not exists tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  label text not null,
  slug text not null,
  color text not null default '#49d6a8',
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists contact_tags (
  contact_id uuid not null references contacts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, tag_id)
);

create table if not exists groups (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references user_profiles(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid references user_profiles(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'invited' check (status in ('invited', 'active', 'removed')),
  created_at timestamptz not null default now(),
  unique (group_id, email)
);

create table if not exists group_contacts (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references groups(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  shared_by uuid not null references user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, contact_id)
);

create table if not exists custom_fields (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references user_profiles(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  scope text not null check (scope in ('user', 'group')),
  key text not null,
  label text not null,
  type text not null check (type in ('short_text', 'long_text', 'number', 'select', 'checkbox', 'multiselect', 'date')),
  options jsonb not null default '[]',
  required boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists custom_field_values (
  id uuid primary key default uuid_generate_v4(),
  contact_id uuid not null references contacts(id) on delete cascade,
  custom_field_id uuid not null references custom_fields(id) on delete cascade,
  value jsonb not null default 'null',
  updated_at timestamptz not null default now(),
  unique (contact_id, custom_field_id)
);

create table if not exists merge_suggestions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  left_contact_id uuid not null references contacts(id) on delete cascade,
  right_contact_id uuid not null references contacts(id) on delete cascade,
  reason text not null check (reason in ('email_exact_match', 'phone_exact_match')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'ignored')),
  created_at timestamptz not null default now(),
  unique (user_id, left_contact_id, right_contact_id)
);

create table if not exists chat_threads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  title text not null default 'Novo chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists contacts_user_search_idx on contacts using gin(search_vector);
create index if not exists contacts_user_ddd_idx on contacts(user_id, derived_ddd);
create index if not exists contact_emails_email_idx on contact_emails(email);
create index if not exists contact_phones_phone_idx on contact_phones(phone);
create index if not exists tags_user_slug_idx on tags(user_id, slug);

alter table user_profiles enable row level security;
alter table contact_sources enable row level security;
alter table contacts enable row level security;
alter table contact_emails enable row level security;
alter table contact_phones enable row level security;
alter table contact_links enable row level security;
alter table tags enable row level security;
alter table contact_tags enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table group_contacts enable row level security;
alter table custom_fields enable row level security;
alter table custom_field_values enable row level security;
alter table merge_suggestions enable row level security;
alter table chat_threads enable row level security;
alter table chat_messages enable row level security;

create policy "profiles own read write" on user_profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles public read" on user_profiles for select using (is_public = true);

create policy "sources own" on contact_sources for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "contacts own" on contacts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "emails via contact owner" on contact_emails for all using (exists (select 1 from contacts c where c.id = contact_id and c.user_id = auth.uid()));
create policy "phones via contact owner" on contact_phones for all using (exists (select 1 from contacts c where c.id = contact_id and c.user_id = auth.uid()));
create policy "links via contact owner" on contact_links for all using (exists (select 1 from contacts c where c.id = contact_id and c.user_id = auth.uid()));
create policy "tags own" on tags for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "contact tags via owner" on contact_tags for all using (exists (select 1 from contacts c where c.id = contact_id and c.user_id = auth.uid()));

create policy "groups visible to members" on groups for select using (
  owner_id = auth.uid() or exists (select 1 from group_members gm where gm.group_id = id and gm.user_id = auth.uid() and gm.status = 'active')
);
create policy "groups owner write" on groups for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "group members visible to group members" on group_members for select using (
  exists (select 1 from groups g where g.id = group_id and (g.owner_id = auth.uid() or exists (select 1 from group_members self where self.group_id = g.id and self.user_id = auth.uid() and self.status = 'active')))
);
create policy "group members admin write" on group_members for all using (
  exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
);
create policy "group contacts visible to members" on group_contacts for select using (
  exists (select 1 from groups g where g.id = group_id and (g.owner_id = auth.uid() or exists (select 1 from group_members gm where gm.group_id = g.id and gm.user_id = auth.uid() and gm.status = 'active')))
);
create policy "group contacts shared by owner" on group_contacts for insert with check (shared_by = auth.uid());

create policy "custom fields own or group admin" on custom_fields for all using (
  user_id = auth.uid() or exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
) with check (
  user_id = auth.uid() or exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
);
create policy "custom values via contact owner" on custom_field_values for all using (exists (select 1 from contacts c where c.id = contact_id and c.user_id = auth.uid()));
create policy "merge suggestions own" on merge_suggestions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "chat threads own" on chat_threads for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "chat messages via thread owner" on chat_messages for all using (exists (select 1 from chat_threads t where t.id = thread_id and t.user_id = auth.uid()));
