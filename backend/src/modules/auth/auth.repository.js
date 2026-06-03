import crypto from "node:crypto";
import { hasDatabase, query } from "../../db/pool.js";
import { readLocalDb, updateLocalDb } from "../../db/localStore.js";

function mapProfile(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    provider: row.provider,
    isPublic: row.is_public,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function bootstrapProfile(user, userAgent = "") {
  if (!hasDatabase) {
    const db = await readLocalDb();
    const existing = db.profiles.find((profile) => profile.id === user.id);
    if (existing) return existing;
    const now = new Date().toISOString();
    const profile = {
      id: user.id,
      email: user.email,
      displayName: user.name || user.email,
      avatarUrl: user.avatarUrl || null,
      provider: user.provider || "email",
      isPublic: false,
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now
    };
    await updateLocalDb((localDb) => {
      localDb.profiles.push(profile);
    });
    return profile;
  }

  const result = await query(
    `insert into profiles (id, email, display_name, avatar_url, provider, is_public)
     values ($1, $2, $3, $4, $5, false)
     on conflict (id) do update set
       email = excluded.email,
       display_name = coalesce(profiles.display_name, excluded.display_name),
       avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
       provider = excluded.provider,
       updated_at = now()
     returning *`,
    [user.id, user.email, user.name || user.email, user.avatarUrl || null, user.provider || "email"]
  );

  await query(
    `insert into app_users (id, email, role, plan)
     values ($1, $2, $3, $4)
     on conflict (id) do update set email = excluded.email, updated_at = now()`,
    [user.id, user.email, user.role || "standard", user.plan || "standard"]
  );

  await query(
    `insert into auth_sessions (user_id, provider, user_agent, ip_hash)
     values ($1, $2, $3, $4)`,
    [user.id, user.provider || "email", userAgent, crypto.createHash("sha256").update(user.id + userAgent).digest("hex")]
  );

  return mapProfile(result.rows[0]);
}

export async function upsertPushSubscription(userId, payload, userAgent = "") {
  if (!hasDatabase) {
    return updateLocalDb((localDb) => {
      const existing = localDb.pushSubscriptions.find((subscription) => subscription.endpoint === payload.endpoint);
      if (existing) {
        Object.assign(existing, payload, { userId, userAgent, updatedAt: new Date().toISOString() });
        return existing;
      }
      const subscription = {
        id: crypto.randomUUID(),
        userId,
        userAgent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...payload
      };
      localDb.pushSubscriptions.push(subscription);
      return subscription;
    });
  }

  const result = await query(
    `insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
     values ($1, $2, $3, $4, $5)
     on conflict (endpoint) do update set
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       user_agent = excluded.user_agent,
       updated_at = now()
     returning id, user_id, endpoint, created_at, updated_at`,
    [userId, payload.endpoint, payload.keys.p256dh, payload.keys.auth, userAgent]
  );

  return result.rows[0];
}
