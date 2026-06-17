import crypto from "node:crypto";
import { readLocalDb, updateLocalDb } from "../../db/localStore.js";
import { hasDatabase, query, withTransaction } from "../../db/pool.js";
import { deriveDddFromPhone } from "../../utils/phone.js";

function deriveDdd(phones = []) {
  return deriveDddFromPhone(phones.find(Boolean));
}

function deriveDdds(phones = []) {
  return [...new Set(phones.map((phone) => deriveDddFromPhone(phone)).filter(Boolean))];
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
  const derivedDdds = payload.derivedDdds?.length ? payload.derivedDdds : deriveDdds(phones);
  return {
    avatarUrl: payload.avatarUrl || "",
    description: payload.description || "",
    email: payload.email || emails[0] || "",
    emails,
    phones,
    derivedDdd: payload.derivedDdd || derivedDdds[0] || deriveDdd(phones),
    derivedDdds,
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

function normalizeAccess(userOrOwnerId) {
  if (typeof userOrOwnerId === "object" && userOrOwnerId) {
    return {
      id: userOrOwnerId.id,
      email: userOrOwnerId.email || ""
    };
  }

  return {
    id: userOrOwnerId,
    email: ""
  };
}

function filterValue(filters, camelKey, snakeKey = camelKey) {
  return filters[camelKey] ?? filters[snakeKey];
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
    derivedDdds: row.derived_ddds || (row.derived_ddd ? [row.derived_ddd] : []),
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

export async function listContacts(userOrOwnerId, filters = {}) {
  const access = normalizeAccess(userOrOwnerId);

  if (!hasDatabase) {
    const db = await readLocalDb();
    const search = filters.search?.toLowerCase() || "";
    const tag = filters.tag?.toLowerCase() || "";
    const ddd = filters.ddd || "";
    const problemSolved = filterValue(filters, "problemSolved", "problem_solved")?.toLowerCase() || "";
    const currentDemand = filterValue(filters, "currentDemand", "current_demand")?.toLowerCase() || "";
    const source = filterValue(filters, "sourceOrigin", "source_origin") || filters.source || "";
    const scope = filterValue(filters, "recordScope", "record_scope") || filters.scope || "";
    return db.contacts
      .filter((contact) => contact.ownerId === access.id || access.id === "demo-user")
      .filter((contact) => {
        const haystack = `${contact.name} ${contact.email} ${contact.company} ${contact.role} ${contact.area} ${contact.description} ${contact.problemSolved} ${contact.currentDemand} ${contact.tags?.join(" ")}`.toLowerCase();
        return search ? haystack.includes(search) : true;
      })
      .filter((contact) => (tag ? contact.tags.map((item) => item.toLowerCase()).includes(tag) : true))
      .filter((contact) => (ddd ? contact.derivedDdd === ddd || contact.derivedDdds?.includes(ddd) : true))
      .filter((contact) => (problemSolved ? contact.problemSolved?.toLowerCase().includes(problemSolved) : true))
      .filter((contact) => (currentDemand ? contact.currentDemand?.toLowerCase().includes(currentDemand) : true))
      .filter((contact) => (source ? contact.sourceOrigin === source : true))
      .filter((contact) => (scope ? contact.recordScopes?.includes(scope) : true))
      .sort((a, b) => new Date(b.lastInteractionAt || b.createdAt) - new Date(a.lastInteractionAt || a.createdAt));
  }

  const clauses = [
    `(c.owner_id = $1 or exists (
      select 1
      from group_contact_refs gcr
      join shared_groups sg on sg.id = gcr.group_id
      left join group_members gm on gm.group_id = gcr.group_id and gm.status <> 'removed'
      where gcr.contact_id = c.id
        and (
          sg.owner_id = $1
          or gm.user_id = $1
          or ($2 <> '' and lower(gm.email) = lower($2))
        )
    ))`
  ];
  const params = [access.id, access.email];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(`(c.name ilike $${params.length} or c.email ilike $${params.length} or c.company ilike $${params.length} or c.role ilike $${params.length} or c.description ilike $${params.length} or c.problem_solved ilike $${params.length} or c.current_demand ilike $${params.length})`);
  }

  if (filters.tag) {
    params.push(filters.tag);
    clauses.push(`$${params.length} = any(c.tags)`);
  }

  if (filters.ddd) {
    params.push(filters.ddd);
    clauses.push(`(c.derived_ddd = $${params.length} or $${params.length} = any(c.derived_ddds))`);
  }

  const problemSolved = filterValue(filters, "problemSolved", "problem_solved");
  if (problemSolved) {
    params.push(`%${problemSolved}%`);
    clauses.push(`c.problem_solved ilike $${params.length}`);
  }

  const currentDemand = filterValue(filters, "currentDemand", "current_demand");
  if (currentDemand) {
    params.push(`%${currentDemand}%`);
    clauses.push(`c.current_demand ilike $${params.length}`);
  }

  const source = filterValue(filters, "sourceOrigin", "source_origin") || filters.source;
  if (source) {
    params.push(source);
    clauses.push(`c.source_origin = $${params.length}`);
  }

  const scope = filterValue(filters, "recordScope", "record_scope") || filters.scope;
  if (scope) {
    params.push(scope);
    clauses.push(`$${params.length} = any(c.record_scopes)`);
  }

  const result = await query(
    `select distinct c.* from contacts c where ${clauses.join(" and ")} order by c.created_at desc`,
    params
  );
  return result.rows.map(mapContact);
}

async function getOwnedContact(ownerId, id) {
  if (!hasDatabase) {
    const db = await readLocalDb();
    return db.contacts.find((contact) => contact.id === id && (contact.ownerId === ownerId || ownerId === "demo-user"));
  }

  const result = await query("select * from contacts where owner_id = $1 and id = $2", [ownerId, id]);
  return result.rows[0] ? mapContact(result.rows[0]) : null;
}

export async function getContact(userOrOwnerId, id) {
  const access = normalizeAccess(userOrOwnerId);

  if (!hasDatabase) {
    const db = await readLocalDb();
    return db.contacts.find((contact) => contact.id === id && (contact.ownerId === access.id || access.id === "demo-user"));
  }

  const result = await query(
    `select c.*
     from contacts c
     where c.id = $3
       and (
         c.owner_id = $1
         or exists (
           select 1
           from group_contact_refs gcr
           join shared_groups sg on sg.id = gcr.group_id
           left join group_members gm on gm.group_id = gcr.group_id and gm.status <> 'removed'
           where gcr.contact_id = c.id
             and (
               sg.owner_id = $1
               or gm.user_id = $1
               or ($2 <> '' and lower(gm.email) = lower($2))
             )
         )
       )`,
    [access.id, access.email, id]
  );
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
       owner_id, name, avatar_url, description, email, emails, phones, derived_ddd, derived_ddds,
       company, role, area, proximity, tags, source_origin, social_links,
       current_demand, problem_solved, internal_notes, record_scopes, linked_user_id, custom_values
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
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
      normalized.derivedDdds,
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
  const existing = await getOwnedContact(ownerId, id);
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
         derived_ddd = $9, derived_ddds = $10, company = $11, role = $12, area = $13, proximity = $14,
         tags = $15, source_origin = $16, social_links = $17, current_demand = $18,
         problem_solved = $19, internal_notes = $20, record_scopes = $21,
         linked_user_id = $22, custom_values = $23, updated_at = now()
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
      normalized.derivedDdds,
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

function uniqStrings(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function mergeContactRecords(left, right) {
  return {
    ...left,
    name: left.name || right.name,
    avatarUrl: left.avatarUrl || right.avatarUrl,
    description: [left.description, right.description].filter(Boolean).join("\n\n"),
    email: left.email || right.email,
    emails: uniqStrings([...(left.emails || []), left.email, ...(right.emails || []), right.email]).map((email) => email.toLowerCase()),
    phones: uniqStrings([...(left.phones || []), ...(right.phones || [])]),
    derivedDdds: uniqStrings([...(left.derivedDdds || []), left.derivedDdd, ...(right.derivedDdds || []), right.derivedDdd]),
    company: left.company || right.company,
    role: left.role || right.role,
    area: left.area || right.area,
    proximity: Math.max(left.proximity || 0, right.proximity || 0),
    tags: uniqStrings([...(left.tags || []), ...(right.tags || [])]),
    sourceOrigin: left.sourceOrigin === right.sourceOrigin ? left.sourceOrigin : "other",
    socialLinks: { ...(right.socialLinks || {}), ...(left.socialLinks || {}) },
    currentDemand: left.currentDemand || right.currentDemand,
    problemSolved: left.problemSolved || right.problemSolved,
    internalNotes: [left.internalNotes, right.internalNotes].filter(Boolean).join("\n\n"),
    recordScopes: uniqStrings([...(left.recordScopes || []), ...(right.recordScopes || [])]),
    linkedUserId: left.linkedUserId || right.linkedUserId,
    customValues: { ...(right.customValues || {}), ...(left.customValues || {}) }
  };
}

export async function listPotentialDuplicates(ownerId) {
  if (hasDatabase) {
    const result = await query(
      `select
         c1.id as left_id,
         c2.id as right_id,
         case
           when c1.emails && c2.emails then 'email_exact_match'
           else 'phone_exact_match'
         end as match_reason,
         case
           when c1.emails && c2.emails then (
             select email from unnest(c1.emails) as left_email(email)
             intersect
             select email from unnest(c2.emails) as right_email(email)
             limit 1
           )
           else (
             select phone from unnest(c1.phones) as left_phone(phone)
             intersect
             select phone from unnest(c2.phones) as right_phone(phone)
             limit 1
           )
         end as match_value
       from contacts c1
       join contacts c2
         on c1.owner_id = c2.owner_id
        and c1.id < c2.id
       where c1.owner_id = $1
         and (c1.emails && c2.emails or c1.phones && c2.phones)
         and not exists (
           select 1
           from ignored_duplicate_pairs ignored
           where ignored.owner_id = $1
             and (
               (ignored.left_contact_id = c1.id and ignored.right_contact_id = c2.id)
               or (ignored.left_contact_id = c2.id and ignored.right_contact_id = c1.id)
             )
         )
       order by c1.created_at desc, c2.created_at desc`,
      [ownerId]
    );

    const pairs = await Promise.all(
      result.rows.map(async (row) => {
        const [left, right] = await Promise.all([
          getOwnedContact(ownerId, row.left_id),
          getOwnedContact(ownerId, row.right_id)
        ]);

        return {
          id: [row.left_id, row.right_id].sort().join(":"),
          reason: row.match_reason,
          matchValue: row.match_value,
          left,
          right
        };
      })
    );

    return pairs.filter((pair) => pair.left && pair.right);
  }

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

export async function ignoreDuplicatePair(ownerId, payload) {
  const [leftContactId, rightContactId] = [payload.leftContactId, payload.rightContactId].sort();

  if (hasDatabase) {
    await query(
      `insert into ignored_duplicate_pairs (owner_id, left_contact_id, right_contact_id, reason)
       values ($1, $2, $3, $4)
       on conflict (owner_id, left_contact_id, right_contact_id) do update set
         reason = excluded.reason`,
      [ownerId, leftContactId, rightContactId, payload.reason || "user_ignored"]
    );
  }

  return {
    id: [leftContactId, rightContactId].join(":"),
    status: "ignored",
    reason: payload.reason || "user_ignored"
  };
}

export async function mergeDuplicatePair(ownerId, payload) {
  const left = await getOwnedContact(ownerId, payload.leftContactId);
  const right = await getOwnedContact(ownerId, payload.rightContactId);
  if (!left || !right || left.id === right.id) return null;

  const mergedPayload = mergeContactRecords(left, right);
  const pairKey = [left.id, right.id].sort().join(":");

  if (!hasDatabase) {
    const merged = await updateContact(ownerId, left.id, mergedPayload);
    await updateLocalDb((localDb) => {
      localDb.interactions.forEach((interaction) => {
        if (interaction.contactId === right.id) interaction.contactId = left.id;
      });
      localDb.contacts = localDb.contacts.filter((contact) => contact.id !== right.id);
    });

    return {
      id: pairKey,
      status: "merged",
      mergedContact: merged
    };
  }

  return withTransaction(async (client) => {
    const normalized = normalizeContactPayload(mergedPayload);
    const linkedUser = await client.query(
      "select id from profiles where is_public = true and email = any($1::text[]) limit 1",
      [normalized.emails]
    );
    const linkedUserId = linkedUser.rows[0]?.id || normalized.linkedUserId;

    const mergedResult = await client.query(
      `update contacts
       set name = $3, avatar_url = $4, description = $5, email = $6, emails = $7, phones = $8,
           derived_ddd = $9, derived_ddds = $10, company = $11, role = $12, area = $13, proximity = $14,
           tags = $15, source_origin = $16, social_links = $17, current_demand = $18,
           problem_solved = $19, internal_notes = $20, record_scopes = $21,
           linked_user_id = $22, custom_values = $23, updated_at = now()
       where owner_id = $1 and id = $2
       returning *`,
      [
        ownerId,
        left.id,
        mergedPayload.name,
        normalized.avatarUrl || null,
        normalized.description || null,
        normalized.email || null,
        normalized.emails,
        normalized.phones,
        normalized.derivedDdd,
        normalized.derivedDdds,
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

    await client.query("update interactions set contact_id = $1 where contact_id = $2", [left.id, right.id]);
    await client.query("update intelligence_snapshots set contact_id = $1 where contact_id = $2", [left.id, right.id]);

    await client.query(
      `delete from group_contact_refs right_refs
       where right_refs.contact_id = $1
         and exists (
           select 1
           from group_contact_refs left_refs
           where left_refs.group_id = right_refs.group_id
             and left_refs.owner_id = right_refs.owner_id
             and left_refs.contact_id = $2
         )`,
      [right.id, left.id]
    );
    await client.query("update group_contact_refs set contact_id = $1 where contact_id = $2", [left.id, right.id]);

    await client.query(
      `delete from contact_edges right_edges
       where right_edges.owner_id = $1
         and (right_edges.source_contact_id = $2 or right_edges.target_contact_id = $2)
         and (
           case when right_edges.source_contact_id = $2 then $3 else right_edges.source_contact_id end =
           case when right_edges.target_contact_id = $2 then $3 else right_edges.target_contact_id end
           or exists (
             select 1
             from contact_edges left_edges
             where left_edges.owner_id = right_edges.owner_id
               and left_edges.source_contact_id =
                 case when right_edges.source_contact_id = $2 then $3 else right_edges.source_contact_id end
               and left_edges.target_contact_id =
                 case when right_edges.target_contact_id = $2 then $3 else right_edges.target_contact_id end
           )
         )`,
      [ownerId, right.id, left.id]
    );
    await client.query(
      `update contact_edges
       set source_contact_id = case when source_contact_id = $2 then $1 else source_contact_id end,
           target_contact_id = case when target_contact_id = $2 then $1 else target_contact_id end
       where owner_id = $3 and (source_contact_id = $2 or target_contact_id = $2)`,
      [left.id, right.id, ownerId]
    );

    const [leftContactId, rightContactId] = [left.id, right.id].sort();
    await client.query(
      `insert into ignored_duplicate_pairs (owner_id, left_contact_id, right_contact_id, reason)
       values ($1, $2, $3, 'merged')
       on conflict (owner_id, left_contact_id, right_contact_id) do update set
         reason = 'merged'`,
      [ownerId, leftContactId, rightContactId]
    );

    await client.query("delete from contacts where owner_id = $1 and id = $2", [ownerId, right.id]);

    return {
      id: pairKey,
      status: "merged",
      mergedContact: mapContact(mergedResult.rows[0])
    };
  });
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
    ddds: contact.derivedDdds || [],
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

