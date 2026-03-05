import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "ryla-offline";
const DB_VERSION = 1;
const STORE_NAME = "api-cache";

interface CacheEntry {
  url: string;
  data: unknown;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "url" });
        }
      },
    });
  }
  return dbPromise;
}

/** Save API response data to IndexedDB */
export async function cacheSet(url: string, data: unknown): Promise<void> {
  try {
    const db = await getDB();
    const entry: CacheEntry = { url, data, timestamp: Date.now() };
    await db.put(STORE_NAME, entry);
  } catch {
    // IndexedDB not available — silently skip
  }
}

/** Get cached API response from IndexedDB */
export async function cacheGet<T = unknown>(url: string, maxAgeMs?: number): Promise<T | null> {
  try {
    const db = await getDB();
    const entry = (await db.get(STORE_NAME, url)) as CacheEntry | undefined;
    if (!entry) return null;
    if (maxAgeMs && Date.now() - entry.timestamp > maxAgeMs) return null;
    return entry.data as T;
  } catch {
    return null;
  }
}

/** Clear all cached data */
export async function cacheClear(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch {
    // Silent fail
  }
}
