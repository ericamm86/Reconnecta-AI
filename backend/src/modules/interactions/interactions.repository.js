import crypto from "node:crypto";
import { readLocalDb, updateLocalDb } from "../../db/localStore.js";
import { hasDatabase, query } from "../../db/pool.js";

function mapInteraction(row) {
  return {
    id: row.id,
    contactId: row.contact_id,
    type: row.type,
    occurredAt: row.occurred_at,
    summary: row.summary,
    notesMarkdown: row.notes_markdown,
    sentiment: row.sentiment,
    createdAt: row.created_at
  };
}

export async function listInteractions(contactId) {
  if (!hasDatabase) {
    const db = await readLocalDb();
    return db.interactions
      .filter((interaction) => (contactId ? interaction.contactId === contactId : true))
      .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  }

  const params = [];
  const where = contactId ? "where contact_id = $1" : "";
  if (contactId) params.push(contactId);
  const result = await query(`select * from interactions ${where} order by occurred_at desc`, params);
  return result.rows.map(mapInteraction);
}

export async function createInteraction(payload) {
  if (!hasDatabase) {
    const now = new Date().toISOString();
    const interaction = {
      id: crypto.randomUUID(),
      occurredAt: payload.occurredAt || now,
      createdAt: now,
      ...payload
    };
    await updateLocalDb((localDb) => {
      localDb.interactions.unshift(interaction);
      const contact = localDb.contacts.find((item) => item.id === payload.contactId);
      if (contact) {
        contact.lastInteractionAt = interaction.occurredAt;
        contact.updatedAt = now;
        contact.proximity = Math.min(100, Math.round(contact.proximity + 4));
      }
    });
    return interaction;
  }

  const result = await query(
    `insert into interactions (contact_id, type, occurred_at, summary, notes_markdown, sentiment)
     values ($1, $2, $3, $4, $5, $6)
     returning *`,
    [
      payload.contactId,
      payload.type,
      payload.occurredAt || new Date().toISOString(),
      payload.summary,
      payload.notesMarkdown,
      payload.sentiment
    ]
  );

  await query("update contacts set last_interaction_at = $1, updated_at = now() where id = $2", [
    result.rows[0].occurred_at,
    payload.contactId
  ]);

  return mapInteraction(result.rows[0]);
}
