import crypto from "node:crypto";
import { readLocalDb, updateLocalDb } from "../../db/localStore.js";
import { hasDatabase, query } from "../../db/pool.js";

function mapPublicProfile(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    isActive: row.is_active,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    company: row.company,
    location: row.location,
    tags: row.tags || [],
    visibility: row.visibility,
    updatedAt: row.updated_at
  };
}

function mapGroup(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMember(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    email: row.email,
    role: row.role,
    status: row.status,
    invitedAt: row.invited_at,
    joinedAt: row.joined_at
  };
}

function mapCustomField(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    key: row.key,
    label: row.label,
    type: row.type,
    options: row.options || [],
    required: row.required,
    createdAt: row.created_at
  };
}

export function buildUserContext(user) {
  const role = user.role || "standard";
  return {
    id: user.id,
    email: user.email,
    role,
    plan: user.plan || "standard",
    scopes: {
      privateCrm: ["contacts:read", "contacts:write", "interactions:write", "intelligence:run"],
      publicNetwork: ["public_profile:read", "public_profile:write", "directory:read"],
      sharedGroups:
        role === "admin"
          ? ["groups:read", "groups:create", "groups:update", "groups:delete", "groups:members:manage", "groups:fields:manage"]
          : ["groups:read", "groups:join", "groups:member:interact"]
    }
  };
}

export async function getPublicProfile(ownerId) {
  if (!hasDatabase) {
    const db = await readLocalDb();
    return db.publicProfiles.find((profile) => profile.ownerId === ownerId) || null;
  }

  const result = await query("select * from public_profiles where owner_id = $1", [ownerId]);
  return result.rows[0] ? mapPublicProfile(result.rows[0]) : null;
}

export async function upsertPublicProfile(ownerId, payload) {
  if (!hasDatabase) {
    const now = new Date().toISOString();
    return updateLocalDb((localDb) => {
      const existing = localDb.publicProfiles.find((profile) => profile.ownerId === ownerId);
      if (existing) {
        Object.assign(existing, payload, { updatedAt: now });
        return existing;
      }
      const profile = { id: crypto.randomUUID(), ownerId, updatedAt: now, ...payload };
      localDb.publicProfiles.unshift(profile);
      return profile;
    });
  }

  const result = await query(
    `insert into public_profiles (owner_id, is_active, display_name, headline, bio, company, location, tags, visibility)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (owner_id) do update set
       is_active = excluded.is_active,
       display_name = excluded.display_name,
       headline = excluded.headline,
       bio = excluded.bio,
       company = excluded.company,
       location = excluded.location,
       tags = excluded.tags,
       visibility = excluded.visibility,
       updated_at = now()
     returning *`,
    [
      ownerId,
      payload.isActive,
      payload.displayName,
      payload.headline || null,
      payload.bio || null,
      payload.company || null,
      payload.location || null,
      payload.tags,
      payload.visibility
    ]
  );
  return mapPublicProfile(result.rows[0]);
}

export async function listDirectory(filters = {}) {
  const search = filters.search?.toLowerCase() || "";
  if (!hasDatabase) {
    const db = await readLocalDb();
    return db.publicProfiles
      .filter((profile) => profile.isActive && profile.visibility !== "hidden")
      .filter((profile) => {
        const haystack = `${profile.displayName} ${profile.headline} ${profile.company} ${profile.location} ${profile.tags.join(" ")}`.toLowerCase();
        return search ? haystack.includes(search) : true;
      });
  }

  const params = [];
  const clauses = ["is_active = true", "visibility <> 'hidden'"];
  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(`(display_name ilike $${params.length} or headline ilike $${params.length} or company ilike $${params.length})`);
  }
  const result = await query(`select * from public_profiles where ${clauses.join(" and ")} order by updated_at desc`, params);
  return result.rows.map(mapPublicProfile);
}

export async function listGroups(user) {
  if (!hasDatabase) {
    const db = await readLocalDb();
    return db.sharedGroups
      .filter((group) => group.ownerId === user.id || db.groupMembers.some((member) => member.groupId === group.id && (member.userId === user.id || member.email === user.email) && member.status !== "removed"))
      .map((group) => ({
        ...group,
        members: db.groupMembers.filter((member) => member.groupId === group.id),
        customFields: db.groupCustomFields.filter((field) => field.groupId === group.id)
      }));
  }

  const result = await query(
    `select distinct g.*
     from shared_groups g
     left join group_members gm on gm.group_id = g.id
     where g.owner_id = $1 or (gm.user_id = $1 or gm.email = $2) and gm.status <> 'removed'
     order by g.updated_at desc`,
    [user.id, user.email]
  );
  return result.rows.map(mapGroup);
}

export async function getGroup(user, groupId) {
  const groups = await listGroups(user);
  const group = groups.find((item) => item.id === groupId);
  if (!group) return null;

  if (!hasDatabase) return group;

  const [members, fields] = await Promise.all([
    query("select * from group_members where group_id = $1 order by invited_at desc", [groupId]),
    query("select * from group_custom_fields where group_id = $1 order by created_at desc", [groupId])
  ]);

  return {
    ...group,
    members: members.rows.map(mapMember),
    customFields: fields.rows.map(mapCustomField)
  };
}

export async function createGroup(ownerId, payload) {
  if (!hasDatabase) {
    const now = new Date().toISOString();
    const group = { id: crypto.randomUUID(), ownerId, createdAt: now, updatedAt: now, ...payload };
    await updateLocalDb((localDb) => {
      localDb.sharedGroups.unshift(group);
      localDb.groupMembers.unshift({
        id: crypto.randomUUID(),
        groupId: group.id,
        userId: ownerId,
        email: "demo@reconnect.ai",
        role: "admin",
        status: "active",
        invitedAt: now,
        joinedAt: now
      });
    });
    return group;
  }

  const result = await query(
    `insert into shared_groups (owner_id, name, description, visibility)
     values ($1, $2, $3, $4)
     returning *`,
    [ownerId, payload.name, payload.description || null, payload.visibility]
  );
  return mapGroup(result.rows[0]);
}

export async function updateGroup(user, groupId, payload) {
  const group = await getGroup(user, groupId);
  if (!group) return null;

  if (!hasDatabase) {
    return updateLocalDb((localDb) => {
      const index = localDb.sharedGroups.findIndex((item) => item.id === groupId);
      localDb.sharedGroups[index] = { ...localDb.sharedGroups[index], ...payload, updatedAt: new Date().toISOString() };
      return localDb.sharedGroups[index];
    });
  }

  const next = { ...group, ...payload };
  const result = await query(
    `update shared_groups
     set name = $3, description = $4, visibility = $5, updated_at = now()
     where id = $1 and owner_id = $2
     returning *`,
    [groupId, user.id, next.name, next.description || null, next.visibility]
  );
  return result.rows[0] ? mapGroup(result.rows[0]) : null;
}

export async function deleteGroup(user, groupId) {
  const group = await getGroup(user, groupId);
  if (!group) return false;

  if (!hasDatabase) {
    return updateLocalDb((localDb) => {
      const index = localDb.sharedGroups.findIndex((item) => item.id === groupId);
      if (index === -1) return false;
      localDb.sharedGroups.splice(index, 1);
      localDb.groupMembers = localDb.groupMembers.filter((member) => member.groupId !== groupId);
      localDb.groupCustomFields = localDb.groupCustomFields.filter((field) => field.groupId !== groupId);
      return true;
    });
  }

  const result = await query("delete from shared_groups where id = $1 and owner_id = $2", [groupId, user.id]);
  return result.rowCount > 0;
}

export async function inviteGroupMember(user, groupId, payload) {
  const group = await getGroup(user, groupId);
  if (!group) return null;

  if (!hasDatabase) {
    const member = {
      id: crypto.randomUUID(),
      groupId,
      userId: null,
      email: payload.email,
      role: payload.role,
      status: "invited",
      invitedAt: new Date().toISOString(),
      joinedAt: null
    };
    await updateLocalDb((localDb) => {
      localDb.groupMembers.unshift(member);
    });
    return member;
  }

  const result = await query(
    `insert into group_members (group_id, email, role, status)
     values ($1, $2, $3, 'invited')
     on conflict (group_id, email) do update set role = excluded.role, status = 'invited', invited_at = now()
     returning *`,
    [groupId, payload.email, payload.role]
  );
  return mapMember(result.rows[0]);
}

export async function removeGroupMember(user, groupId, memberId) {
  const group = await getGroup(user, groupId);
  if (!group) return false;

  if (!hasDatabase) {
    return updateLocalDb((localDb) => {
      const member = localDb.groupMembers.find((item) => item.id === memberId && item.groupId === groupId);
      if (!member) return false;
      member.status = "removed";
      return true;
    });
  }

  const result = await query("update group_members set status = 'removed' where id = $1 and group_id = $2", [memberId, groupId]);
  return result.rowCount > 0;
}

export async function createGroupCustomField(user, groupId, payload) {
  const group = await getGroup(user, groupId);
  if (!group) return null;

  if (!hasDatabase) {
    const field = { id: crypto.randomUUID(), groupId, createdAt: new Date().toISOString(), ...payload };
    await updateLocalDb((localDb) => {
      localDb.groupCustomFields.unshift(field);
    });
    return field;
  }

  const result = await query(
    `insert into group_custom_fields (group_id, key, label, type, options, required)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (group_id, key) do update set label = excluded.label, type = excluded.type, options = excluded.options, required = excluded.required
     returning *`,
    [groupId, payload.key, payload.label, payload.type, JSON.stringify(payload.options), payload.required]
  );
  return mapCustomField(result.rows[0]);
}
