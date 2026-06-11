import { readFile } from "node:fs/promises";
import pg from "pg";
import { env } from "../config/env.js";

export const hasDatabase = Boolean(env.databaseUrl);
let schemaReady;

function normalizeConnectionString(connectionString) {
  if (env.nodeEnv !== "production") return connectionString;

  try {
    const url = new URL(connectionString);
    url.searchParams.set("sslmode", "no-verify");
    return url.toString();
  } catch {
    return connectionString;
  }
}

export const pool = hasDatabase
  ? new pg.Pool({
      connectionString: normalizeConnectionString(env.databaseUrl),
      ssl: env.nodeEnv === "production" ? { rejectUnauthorized: false } : false
    })
  : null;

async function ensureSchema() {
  if (!pool) return;
  schemaReady ??= readFile(new URL("./schema.sql", import.meta.url), "utf8").then((schema) => pool.query(schema));
  await schemaReady;
}

export async function query(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  await ensureSchema();
  return pool.query(text, params);
}
