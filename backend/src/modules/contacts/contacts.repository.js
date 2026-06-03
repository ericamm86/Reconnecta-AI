import crypto from "node:crypto";
import { readLocalDb, updateLocalDb } from "../../db/localStore.js";
import { hasDatabase, query } from "../../db/pool.js";
import { deriveDddFromPhone } from "../../utils/phone.js";

function deriveDdd(phones = []) {
  return deriveDddFromPhone(phones.find(Boolean));
}

function normalizeEmails(payload) {
  return [...new Set([payload.email, ...(payload.emails || [])].filter(Boolean).map((email) => email.toLowerCase()))];
}

function normalizePhones(payload) {
  return [...new Set((payload.phones || []).filter(Boolean).map((phone) => phone.trim()))];
}

function normalizeContactPayload(payload) {
  const emails = normalizeEmails(payload);
  const phones = normalizePhones(payload);
  return {
    avatarUrl: payload.avatarUrl || "",
    description: payload.description || "",
    email: payload.email || emails[0] || "",
    emails,
    phones,
    derivedDdd: payload.derivedDdd || deriveDdd(phones),
    company: payload.company || "",
    role: payload.role || "",
    area: payload.area || "",
    proximity: payload.proximity ?? 50,
    tags: payload.tags || [],
    sourceOrigin: payload.sourceOrigin || "manual",
    socialLinks: payload.socialLinks || {},
    currentDemand: payload.currentDemand || "",
    problemSolved: payload.problemSolved || "",
    internalNotes: payload.internalNotes || "",
    recordScopes: payload.recordScopes?.length ? payload.recordScopes : ["INTERNAL_PRIVATE"],
    linkedUserId: payload.linkedUserId || null,
    customValues: payload.customValues || {}
  };
}

function mapContact(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    avatarUrl: row.avatar_url || "",
    description: row.description || "",
    email: row.email || "",
    emails: row.emails || (row.email ? [row.email] : []),
    phones: row.phones || [],
    derivedDdd: row.derived_ddd,
    company: row.company || "",
    role: row.role || "",
    area: row.area || "",
    proximity: row.proximity,
    tags: row.tags || [],
    sourceOrigin: row.source_origin || "manual",
    socialLinks: row.social_links || {},
    currentDemand: row.current_demand || "",
    problemSolved: row.problem_solved || "",
    internalNotes: row.internal_notes || "",
    recordScopes: row.record_scopes || ["INTERNAL_PRIVATE"],
    linkedUserId: row.linked_user_id,
    customValues: row.custom_values || {},
    lastInteractionAt: row.last_interaction_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listContacts(ownerId, filters = {}) {
  if (!hasDatabase) {
    const db = await readLocalDb();
    const search = filters.search?.toLowerCase() || "";
    const tag = filters.tag?.toLowerCase() || "";
    const ddd = filters.ddd || "";
    return db.contacts
      .filter((contact) => contact.ownerId === ownerId || ownerId === "demo-user")
      .filter((contact) => {
        const haystack = `${contact.name} ${contact.email} ${contact.company} ${contact.role} ${contact.area} ${contact.description} ${contact.tags?.join(" ")}`.toLowerCase();
        return search ? haystack.includes(search) : true;
      })
      .filter((contact) => (tag ? contact.tags.map((item) => item.toLowerCase()).includes(tag) : true))
      .filter((contact) => (ddd ? contact.derivedDdd === ddd : true))
      .sort((a, b) => new Date(b.lastInteractionAt || b.createdAt) - new Date(a.lastInteractionAt || a.createdAt));
  }

  const clauses = ["owner_id = $1"];
  const params = [ownerId];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(`(name ilike $${params.length} or company ilike $${params.length} or role ilike $${params.length} or description ilike $${params.length})`);
  }

  if (filters.tag) {
    params.push(filters.tag);
    clauses.push(`$${params.length} = any(tags)`);
  }

  if (filters.ddd) {
    params.push(filters.ddd);
    clauses.push(`derived_ddd = $${params.length}`);
  }

  const result = await query(
    `select * from contacts where ${clauses.join(" and ")} order by coalesce(last_interaction_at, created_at) desc`,
    params
  );
  return result.rows.map(mapContact);
}

export async function getContact(ownerId, id) {
  if (!hasDatabase) {
    const db = await readLocalDb();
    return db.contacts.find((contact) => contact.id === id && (contact.ownerId === ownerId || ownerId === "demo-user"));
  }

  const result = await query("select * from contacts where owner_id = $1 and id = $2", [ownerId, id]);
  return result.rows[0] ? mapContact(result.rows[0]) : null;
}

async function findLinkedUserId(emails) {
  if (!hasDatabase || !emails.length) return null;
  const result = await query(
    "select id from profiles where is_public = true and email = any($1::text[]) limit 1",
    [emails]
  );
  return result.rows[0]?.id || null;
}

export async function createContact(ownerId, payload) {
  const normalized = normalizeContactPayload(payload);

  if (!hasDatabase) {
    const now = new Date().toISOString();
    const contact = {
      id: crypto.randomUUID(),
      ownerId,
      name: payload.name,
      lastInteractionAt: null,
      createdAt: now,
      updatedAt: now,
      ...normalized
    };
    await updateLocalDb((localDb) => {
      localDb.contacts.unshift(contact);
    });
    return contact;
  }

  const linkedUserId = await findLinkedUserId(normalized.emails);
  const result = await query(
    `insert into contacts (
       owner_id, name, avatar_url, description, email, emails, phones, derived_ddd,
       company, role, area, proximity, tags, source_origin, social_links,
       current_demand, problem_solved, internal_notes, record_scopes, linked_user_id, custom_values
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
     returning *`,
    [
      ownerId,
      payload.name,
      normalized.avatarUrl || null,
      normalized.description || null,
      normalized.email || null,
      normalized.emails,
      normalized.phones,
      normalized.derivedDdd,
      normalized.company || null,
      normalized.role || null,
      normalized.area || null,
      normalized.proximity,
      normalized.tags,
      normalized.sourceOrigin,
      JSON.stringify(normalized.socialLinks),
      normalized.currentDemand || null,
      normalized.problemSolved || null,
      normalized.internalNotes,
      normalized.recordScopes,
      linkedUserId,
      JSON.stringify(normalized.customValues)
    ]
  );
  return mapContact(result.rows[0]);
}

export async function updateContact(ownerId, id, payload) {
  const existing = await getContact(ownerId, id);
  if (!existing) return null;
  const next = { ...existing, ...payload };
  const normalized = normalizeContactPayload(next);

  if (!hasDatabase) {
    return updateLocalDb((localDb) => {
      const index = localDb.contacts.findIndex((contact) => contact.id === id);
      localDb.contacts[index] = { ...localDb.contacts[index], ...payload, ...normalized, updatedAt: new Date().toISOString() };
      return localDb.contacts[index];
    });
  }

  const linkedUserId = await findLinkedUserId(normalized.emails);
  const result = await query(
    `update contacts
     set name = $3, avatar_url = $4, description = $5, email = $6, emails = $7, phones = $8,
         derived_ddd = $9, company = $10, role = $11, area = $12, proximity = $13,
         tags = $14, source_origin = $15, social_links = $16, current_demand = $17,
         problem_solved = $18, internal_notes = $19, record_scopes = $20,
         linked_user_id = $21, custom_values = $22, updated_at = now()
     where owner_id = $1 and id = $2
     returning *`,
    [
      ownerId,
      id,
      next.name,
      normalized.avatarUrl || null,
      normalized.description || null,
      normalized.email || null,
      normalized.emails,
      normalized.phones,
      normalized.derivedDdd,
      normalized.company || null,
      normalized.role || null,
      normalized.area || null,
      normalized.proximity,
      normalized.tags,
      normalized.sourceOrigin,
      JSON.stringify(normalized.socialLinks),
      normalized.currentDemand || null,
      normalized.problemSolved || null,
      normalized.internalNotes,
      normalized.recordScopes,
      linkedUserId || normalized.linkedUserId,
      JSON.stringify(normalized.customValues)
    ]
  );
  return mapContact(result.rows[0]);
}

export async function deleteContact(ownerId, id) {
  if (!hasDatabase) {
    return updateLocalDb((localDb) => {
      const index = localDb.contacts.findIndex((contact) => contact.id === id && (contact.ownerId === ownerId || ownerId === "demo-user"));
      if (index === -1) return false;
      localDb.contacts.splice(index, 1);
      for (let i = localDb.interactions.length - 1; i >= 0; i -= 1) {
        if (localDb.interactions[i].contactId === id) localDb.interactions.splice(i, 1);
      }
      return true;
    });
  }

  const result = await query("delete from contacts where owner_id = $1 and id = $2", [ownerId, id]);
  return result.rowCount > 0;
}

export async function importContacts(ownerId, payload) {
  const created = [];
  for (const row of payload.rows) {
    created.push(await createContact(ownerId, { ...row, sourceOrigin: payload.source }));
  }
  const duplicates = await listPotentialDuplicates(ownerId);
  return {
    job: {
      id: crypto.randomUUID(),
      source: payload.source,
      status: "completed",
      totalRows: payload.rows.length,
      importedRows: created.length,
      duplicateCandidates: duplicates.length
    },
    contacts: created,
    duplicateCandidates: duplicates
  };
}

export async function listPotentialDuplicates(ownerId) {
  const data = await listContacts(ownerId, {});
  const pairs = [];
  const ignored = new Set();

  for (let i = 0; i < data.length; i += 1) {
    for (let j = i + 1; j < data.length; j += 1) {
      const left = data[i];
      const right = data[j];
      const sharedEmail = left.emails?.find((email) => right.emails?.includes(email));
      const sharedPhone = left.phones?.find((phone) => right.phones?.includes(phone));
      const key = [left.id, right.id].sort().join(":");
      if ((sharedEmail || sharedPhone) && !ignored.has(key)) {
        pairs.push({
          id: key,
          reason: sharedEmail ? "email_exact_match" : "phone_exact_match",
          matchValue: sharedEmail || sharedPhone,
          left,
          right
        });
      }
    }
  }

  return pairs;
}

export async function ignoreDuplicatePair(_ownerId, payload) {
  return {
    id: [payload.leftContactId, payload.rightContactId].sort().join(":"),
    status: "ignored",
    reason: payload.reason || "user_ignored"
  };
}

export async function buildInternalGraph(ownerId) {
  const data = await listContacts(ownerId, {});
  const tagCounts = new Map();
  data.forEach((contact) => {
    contact.tags?.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1));
  });

  const contactNodes = data.map((contact) => ({
    id: `contact:${contact.id}`,
    type: "contact",
    label: contact.name,
    contactId: contact.id,
    score: contact.proximity,
    ddd: contact.derivedDdd,
    scope: contact.recordScopes,
    sourceOrigin: contact.sourceOrigin
  }));

  const tagNodes = [...tagCounts.entries()].map(([tag, count]) => ({
    id: `tag:${tag}`,
    type: "tag",
    label: tag,
    weight: count
  }));

  const edges = data.flatMap((contact) =>
    (contact.tags || []).map((tag) => ({
      id: `edge:${contact.id}:${tag}`,
      source: `contact:${contact.id}`,
      target: `tag:${tag}`,
      type: "HAS_TAG",
      weight: Math.max(1, Math.round(contact.proximity / 20))
    }))
  );

  return {
    generatedAt: new Date().toISOString(),
    nodes: [...contactNodes, ...tagNodes],
    edges
  };
}
