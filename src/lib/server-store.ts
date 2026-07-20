import { promises as fs } from "fs";
import path from "path";
import { createInitialData } from "@/lib/store";
import type { StoreData } from "@/lib/types";
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
export async function readStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    const initial = createInitialData();
    await writeStore(initial);
    return initial;
  }
}
export async function writeStore(data: StoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data), "utf8");
}
