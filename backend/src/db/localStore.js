import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { contacts, groupCustomFields, groupMembers, interactions, publicProfiles, sharedGroups } from "../data/demoStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(__dirname, "../data/local-db.json");
const dbPath = process.env.LOCAL_DB_PATH ? path.resolve(process.env.LOCAL_DB_PATH) : defaultDbPath;

const initialData = {
  profiles: [
    {
      id: "demo-user",
      email: "demo@reconnect.ai",
      displayName: "Demo Operator",
      avatarUrl: null,
      provider: "demo",
      isPublic: false,
      onboardingCompleted: true,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z"
    }
  ],
  pushSubscriptions: [],
  contacts,
  interactions,
  publicProfiles,
  sharedGroups,
  groupMembers,
  groupCustomFields
};

let cache = null;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function ensureFile() {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await fs.access(dbPath);
  } catch {
    await fs.writeFile(dbPath, JSON.stringify(initialData, null, 2), "utf8");
  }
}

export async function readLocalDb() {
  if (cache) return clone(cache);
  await ensureFile();
  const raw = await fs.readFile(dbPath, "utf8");
  cache = {
    ...clone(initialData),
    ...JSON.parse(raw)
  };
  return clone(cache);
}

export async function writeLocalDb(nextDb) {
  cache = {
    ...clone(initialData),
    ...nextDb
  };
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(cache, null, 2), "utf8");
  return clone(cache);
}

export async function updateLocalDb(mutator) {
  const db = await readLocalDb();
  const result = await mutator(db);
  await writeLocalDb(db);
  return result;
}

export { dbPath as localDbPath };
