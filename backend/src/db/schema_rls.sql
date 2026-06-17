-- RLS policies for the current Reconnect AI schema.
-- Run after schema.sql in Supabase SQL Editor.
-- The app backend uses the service role, but these policies protect direct client-side Supabase access.

alter table profiles enable row level security;
alter table app_users enable row level security;
alter table auth_sessions enable row level security;
alter table push_subscriptions enable row level security;
alter table contacts enable row level security;
alter table tags enable row level security;
alter table contact_tags enable row level security;
alter table custom_fields enable row level security;
alter table custom_field_values enable row level security;
alter table contact_import_jobs enable row level security;
alter table ignored_duplicate_pairs enable row level security;
alter table contact_edges enable row level security;
alter table interactions enable row level security;
alter table intelligence_snapshots enable row level security;
alter table public_profiles enable row level security;
alter table shared_groups enable row level security;
alter table group_members enable row level security;
alter table group_custom_fields enable row level security;
alter table group_contact_refs enable row level security;

create or replace function rls_owns_group(group_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from shared_groups
    where id = group_uuid and owner_id = auth.uid()::text
  );
$$;

create or replace function rls_is_group_member(group_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = group_uuid
      and (user_id = auth.uid()::text or email = auth.email())
      and status <> 'removed'
  );
$$;

create or replace function rls_is_group_admin(group_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select rls_owns_group(group_uuid) or exists (
    select 1 from group_members
    where group_id = group_uuid
      and (user_id = auth.uid()::text or email = auth.email())
      and role = 'admin'
      and status <> 'removed'
  );
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles own read write') then
    create policy "profiles own read write" on profiles
      for all using (id = auth.uid()::text)
      with check (id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles public read') then
    create policy "profiles public read" on profiles
      for select using (is_public = true);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'app_users' and policyname = 'app users own read') then
    create policy "app users own read" on app_users
      for select using (id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'auth_sessions' and policyname = 'auth sessions own') then
    create policy "auth sessions own" on auth_sessions
      for all using (user_id = auth.uid()::text)
      with check (user_id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'push_subscriptions' and policyname = 'push subscriptions own') then
    create policy "push subscriptions own" on push_subscriptions
      for all using (user_id = auth.uid()::text)
      with check (user_id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contacts' and policyname = 'contacts own') then
    create policy "contacts own" on contacts
      for all using (owner_id = auth.uid()::text)
      with check (owner_id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tags' and policyname = 'tags own or group member') then
    create policy "tags own or group member" on tags
      for all using (
        owner_id = auth.uid()::text
        or rls_is_group_member(group_id)
      )
      with check (
        owner_id = auth.uid()::text
        or rls_is_group_admin(group_id)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_tags' and policyname = 'contact tags via contact owner') then
    create policy "contact tags via contact owner" on contact_tags
      for all using (exists (select 1 from contacts c where c.id = contact_id and c.owner_id = auth.uid()::text))
      with check (exists (select 1 from contacts c where c.id = contact_id and c.owner_id = auth.uid()::text));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'custom_fields' and policyname = 'custom fields own or group admin') then
    create policy "custom fields own or group admin" on custom_fields
      for all using (
        owner_id = auth.uid()::text
        or rls_owns_group(group_id)
      )
      with check (
        owner_id = auth.uid()::text
        or rls_owns_group(group_id)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'custom_field_values' and policyname = 'custom values via contact owner') then
    create policy "custom values via contact owner" on custom_field_values
      for all using (exists (select 1 from contacts c where c.id = contact_id and c.owner_id = auth.uid()::text))
      with check (exists (select 1 from contacts c where c.id = contact_id and c.owner_id = auth.uid()::text));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_import_jobs' and policyname = 'contact import jobs own') then
    create policy "contact import jobs own" on contact_import_jobs
      for all using (owner_id = auth.uid()::text)
      with check (owner_id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ignored_duplicate_pairs' and policyname = 'ignored duplicates own') then
    create policy "ignored duplicates own" on ignored_duplicate_pairs
      for all using (owner_id = auth.uid()::text)
      with check (owner_id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'contact_edges' and policyname = 'contact edges own') then
    create policy "contact edges own" on contact_edges
      for all using (owner_id = auth.uid()::text)
      with check (owner_id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'interactions' and policyname = 'interactions via contact owner') then
    create policy "interactions via contact owner" on interactions
      for all using (exists (select 1 from contacts c where c.id = contact_id and c.owner_id = auth.uid()::text))
      with check (exists (select 1 from contacts c where c.id = contact_id and c.owner_id = auth.uid()::text));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'intelligence_snapshots' and policyname = 'intelligence via contact owner') then
    create policy "intelligence via contact owner" on intelligence_snapshots
      for all using (exists (select 1 from contacts c where c.id = contact_id and c.owner_id = auth.uid()::text))
      with check (exists (select 1 from contacts c where c.id = contact_id and c.owner_id = auth.uid()::text));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'public_profiles' and policyname = 'public profiles own write') then
    create policy "public profiles own write" on public_profiles
      for all using (owner_id = auth.uid()::text)
      with check (owner_id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'public_profiles' and policyname = 'public profiles visible read') then
    create policy "public profiles visible read" on public_profiles
      for select using (is_active = true and visibility <> 'hidden');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shared_groups' and policyname = 'shared groups visible to members') then
    create policy "shared groups visible to members" on shared_groups
      for select using (
        owner_id = auth.uid()::text
        or rls_is_group_member(id)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shared_groups' and policyname = 'shared groups owner write') then
    create policy "shared groups owner write" on shared_groups
      for all using (owner_id = auth.uid()::text)
      with check (owner_id = auth.uid()::text);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'group_members' and policyname = 'group members visible to group members') then
    create policy "group members visible to group members" on group_members
      for select using (
        rls_owns_group(group_id)
        or rls_is_group_member(group_id)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'group_members' and policyname = 'group members owner write') then
    create policy "group members owner write" on group_members
      for all using (rls_owns_group(group_id))
      with check (rls_owns_group(group_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'group_custom_fields' and policyname = 'group custom fields via group owner') then
    create policy "group custom fields via group owner" on group_custom_fields
      for all using (rls_owns_group(group_id))
      with check (rls_owns_group(group_id));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'group_contact_refs' and policyname = 'group contacts visible to members') then
    create policy "group contacts visible to members" on group_contact_refs
      for select using (
        owner_id = auth.uid()::text
        or rls_is_group_member(group_id)
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'group_contact_refs' and policyname = 'group contacts shared by owner') then
    create policy "group contacts shared by owner" on group_contact_refs
      for all using (owner_id = auth.uid()::text)
      with check (owner_id = auth.uid()::text);
  end if;
end $$;
