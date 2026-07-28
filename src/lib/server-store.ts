import { DatabaseSync } from "node:sqlite";
import { promises as fs } from "fs";
import path from "path";
import { createInitialData, normalizeStoreData } from "@/lib/store";
import { hashPassword, isBcryptHash } from "@/lib/auth-server";
import type { StoreData } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const DB_FILE = path.join(DATA_DIR, "store.db");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_BACKUPS = 30;

let db: DatabaseSync | null = null;
let cache: StoreData | null = null;
let writeChain: Promise<void> = Promise.resolve();

function getDb(): DatabaseSync {
  if (db) return db;
  // sync mkdir via DatabaseSync parent — ensure dir exists beforehand in callers
  db = new DatabaseSync(DB_FILE);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS store_doc (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

async function migratePasswords(
  data: StoreData,
): Promise<{ data: StoreData; changed: boolean }> {
  let changed = false;
  const users = await Promise.all(
    data.users.map(async (u) => {
      if (!u.password || isBcryptHash(u.password)) return u;
      changed = true;
      return { ...u, password: await hashPassword(u.password) };
    }),
  );
  if (!changed) return { data, changed: false };
  return { data: { ...data, users }, changed: true };
}

async function rotateJsonBackup(payload: string): Promise<void> {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeFile(
      path.join(BACKUP_DIR, `store-${stamp}.json`),
      payload,
      "utf8",
    );
    const files = (await fs.readdir(BACKUP_DIR))
      .filter((f) => f.startsWith("store-") && f.endsWith(".json"))
      .sort();
    const excess = files.length - MAX_BACKUPS;
    if (excess > 0) {
      for (const f of files.slice(0, excess)) {
        await fs.unlink(path.join(BACKUP_DIR, f)).catch(() => undefined);
      }
    }
  } catch (error) {
    console.error("backup rotate", error);
  }
}

/** Copia legible store.json (espejo) para inspección / scripts de backup. */
async function mirrorJsonFile(data: StoreData): Promise<void> {
  try {
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    const raw = JSON.stringify(data);
    await fs.writeFile(tmp, raw, "utf8");
    await fs.rename(tmp, DATA_FILE);
  } catch (error) {
    console.error("mirror json", error);
  }
}

function readFromDb(): StoreData | null {
  const row = getDb()
    .prepare("SELECT payload FROM store_doc WHERE id = 1")
    .get() as { payload?: string } | undefined;
  if (!row?.payload) return null;
  try {
    return normalizeStoreData(JSON.parse(row.payload) as Partial<StoreData>);
  } catch {
    return null;
  }
}

function writeToDb(data: StoreData): void {
  const payload = JSON.stringify(data);
  const updatedAt = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO store_doc (id, version, payload, updated_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         version = excluded.version,
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
    )
    .run(data.version ?? 0, payload, updatedAt);
}

async function loadLegacyJson(): Promise<StoreData | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return normalizeStoreData(JSON.parse(raw) as Partial<StoreData>);
  } catch {
    return null;
  }
}

export async function writeStore(data: StoreData): Promise<StoreData> {
  const run = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const normalized = normalizeStoreData(data);
    const payload = JSON.stringify(normalized);
    await rotateJsonBackup(payload);
    writeToDb(normalized);
    await mirrorJsonFile(normalized);
    cache = normalized;
    return normalized;
  };
  const next = writeChain.then(run, run);
  writeChain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export async function readStore(): Promise<StoreData> {
  if (cache) return cache;
  await fs.mkdir(DATA_DIR, { recursive: true });

  let normalized = readFromDb();
  let fromLegacy = false;

  if (!normalized) {
    const legacy = await loadLegacyJson();
    if (legacy) {
      normalized = legacy;
      fromLegacy = true;
    } else {
      normalized = createInitialData();
      fromLegacy = true;
    }
  }

  const migrated = await migratePasswords(normalized);
  normalized = migrated.data;
  cache = normalized;

  if (fromLegacy || migrated.changed) {
    await writeStore(normalized);
    return cache!;
  }

  return normalized;
}

export function clearStoreCache(): void {
  cache = null;
}

/** Cierra la DB (tests / shutdown). */
export function closeStoreDb(): void {
  try {
    db?.close();
  } catch {
    // ignore
  }
  db = null;
  cache = null;
}
