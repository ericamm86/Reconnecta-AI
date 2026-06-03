import pg from "pg";
import { env } from "../config/env.js";

export const hasDatabase = Boolean(env.databaseUrl);

export const pool = hasDatabase
  ? new pg.Pool({
      connectionString: env.databaseUrl,
      ssl: env.nodeEnv === "production" ? { rejectUnauthorized: false } : false
    })
  : null;

export async function query(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return pool.query(text, params);
}
