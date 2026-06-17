import fs from "node:fs/promises";
import { query } from "./pool.js";
import { contacts, groupCustomFields, groupMembers, interactions, publicProfiles, sharedGroups } from "../data/demoStore.js";

const schema = await fs.readFile(new URL("./schema.sql", import.meta.url), "utf8");
await query(schema);

await query(
  `insert into profiles (id, email, display_name, avatar_url, provider, is_public, onboarding_completed)
   values ('demo-user', 'demo@reconnect.ai', 'Demo Operator', null, 'demo', false, true)
   on conflict (id) do update set email = excluded.email, updated_at = now()`
);

await query(
  `insert into app_users (id, email, role, plan)
   values ('demo-user', 'demo@reconnect.ai', 'admin', 'superior')
   on conflict (id) do update set email = excluded.email, role = excluded.role, plan = excluded.plan, updated_at = now()`
);

const contactIdByDemoId = new Map();

for (const contact of contacts) {
  const existingContact = await query("select id from contacts where owner_id = $1 and email = $2 limit 1", [contact.ownerId, contact.email]);
  if (existingContact.rows[0]?.id) {
    contactIdByDemoId.set(contact.id, existingContact.rows[0].id);
    continue;
  }

  const result = await query(
    `insert into contacts (
       owner_id, name, avatar_url, description, email, emails, phones, derived_ddd, derived_ddds,
       company, role, area, proximity, tags, source_origin, social_links,
       current_demand, problem_solved, internal_notes, record_scopes, linked_user_id,
       custom_values, last_interaction_at, created_at, updated_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
             $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
     returning id`,
    [
      contact.ownerId,
      contact.name,
      contact.avatarUrl || null,
      contact.description || null,
      contact.email || null,
      contact.emails,
      contact.phones,
      contact.derivedDdd,
      contact.derivedDdds || (contact.derivedDdd ? [contact.derivedDdd] : []),
      contact.company || null,
      contact.role || null,
      contact.area || null,
      contact.proximity,
      contact.tags,
      contact.sourceOrigin,
      JSON.stringify(contact.socialLinks || {}),
      contact.currentDemand || null,
      contact.problemSolved || null,
      contact.internalNotes || "",
      contact.recordScopes || ["INTERNAL_PRIVATE"],
      contact.linkedUserId || null,
      JSON.stringify(contact.customValues || {}),
      contact.lastInteractionAt || null,
      contact.createdAt,
      contact.updatedAt
    ]
  );

  contactIdByDemoId.set(contact.id, result.rows[0].id);
}

for (const interaction of interactions) {
  const contactId = contactIdByDemoId.get(interaction.contactId);
  if (!contactId) continue;
  await query(
    `insert into interactions (contact_id, type, occurred_at, summary, notes_markdown, sentiment, created_at)
     select $1, $2, $3, $4, $5, $6, $7
     where not exists (
       select 1 from interactions where contact_id = $1 and occurred_at = $3 and summary = $4
     )`,
    [
      contactId,
      interaction.type,
      interaction.occurredAt,
      interaction.summary,
      interaction.notesMarkdown,
      interaction.sentiment,
      interaction.createdAt
    ]
  );
}

for (const profile of publicProfiles) {
  await query(
    `insert into public_profiles (
       owner_id, is_active, display_name, avatar_url, headline, bio, company, location,
       tags, problem_solved, current_demand, social_links, visibility, updated_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     on conflict (owner_id) do update set
       is_active = excluded.is_active,
       display_name = excluded.display_name,
       avatar_url = excluded.avatar_url,
       headline = excluded.headline,
       bio = excluded.bio,
       company = excluded.company,
       location = excluded.location,
       tags = excluded.tags,
       problem_solved = excluded.problem_solved,
       current_demand = excluded.current_demand,
       social_links = excluded.social_links,
       visibility = excluded.visibility,
       updated_at = excluded.updated_at`,
    [
      profile.ownerId,
      profile.isActive,
      profile.displayName,
      profile.avatarUrl || null,
      profile.headline,
      profile.bio,
      profile.company,
      profile.location,
      profile.tags,
      profile.problemSolved || null,
      profile.currentDemand || null,
      JSON.stringify(profile.socialLinks || {}),
      profile.visibility,
      profile.updatedAt
    ]
  );
}

const groupIdByDemoId = new Map();
for (const group of sharedGroups) {
  const existingGroup = await query("select id from shared_groups where owner_id = $1 and name = $2 limit 1", [group.ownerId, group.name]);
  if (existingGroup.rows[0]?.id) {
    groupIdByDemoId.set(group.id, existingGroup.rows[0].id);
    continue;
  }

  const result = await query(
    `insert into shared_groups (owner_id, name, description, visibility, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [group.ownerId, group.name, group.description, group.visibility, group.createdAt, group.updatedAt]
  );
  groupIdByDemoId.set(group.id, result.rows[0].id);
}

for (const member of groupMembers) {
  const groupId = groupIdByDemoId.get(member.groupId);
  if (!groupId) continue;
  await query(
    `insert into group_members (group_id, user_id, email, role, status, invited_at, joined_at)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (group_id, email) do update set role = excluded.role, status = excluded.status`,
    [groupId, member.userId, member.email, member.role, member.status, member.invitedAt, member.joinedAt]
  );
}

for (const field of groupCustomFields) {
  const groupId = groupIdByDemoId.get(field.groupId);
  if (!groupId) continue;
  await query(
    `insert into group_custom_fields (group_id, key, label, type, options, required, created_at)
     values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (group_id, key) do update set label = excluded.label, type = excluded.type, options = excluded.options, required = excluded.required`,
    [groupId, field.key, field.label, field.type, JSON.stringify(field.options), field.required, field.createdAt]
  );
}

console.log("Database schema and demo seed applied.");
