import pg from "pg";
import { env } from "../config/env.js";

export const hasDatabase = Boolean(env.databaseUrl);

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

export async function query(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return pool.query(text, params);
}
