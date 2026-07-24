import { promises as fs } from "fs";
import path from "path";
import { createInitialData, normalizeStoreData } from "@/lib/store";
import type { StoreData } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

// Cache en memoria: evita leer y normalizar el archivo en cada request.
let cache: StoreData | null = null;

export async function readStore(): Promise<StoreData> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    const normalized = normalizeStoreData(parsed);
    cache = normalized;
    // Persiste migración si faltaban campos
    if (
      !parsed.transfers ||
      !parsed.settings ||
      !parsed.branches?.some((b) => b.id === "bodega-central")
    ) {
      await writeStore(normalized);
    }
    return normalized;
  } catch {
    const initial = createInitialData();
    cache = initial;
    await writeStore(initial);
    return initial;
  }
}

export async function writeStore(data: StoreData): Promise<void> {
  const normalized = normalizeStoreData(data);
  cache = normalized;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(normalized), "utf8");
}
