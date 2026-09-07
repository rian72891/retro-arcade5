import { useEffect, useState } from "react";

/**
 * Cache local de ROMs e capas (IndexedDB). Na primeira vez que um jogo é aberto
 * com internet, o arquivo fica guardado no aparelho — depois ele abre offline.
 */
const DB_NAME = "fliperama-offline";
const STORE = "files";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

type Entry = { blob: Blob; savedAt: string };

async function put(key: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ blob, savedAt: new Date().toISOString() } satisfies Entry, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function get(key: string): Promise<Blob | null> {
  const db = await openDb();
  const value = await new Promise<Entry | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as Entry | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value?.blob ?? null;
}

const romKey = (gameId: string) => `rom:${gameId}`;
const coverKey = (gameId: string) => `cover:${gameId}`;

export async function hasCachedRom(gameId: string) {
  try {
    return Boolean(await get(romKey(gameId)));
  } catch {
    return false;
  }
}

export async function cachedRomUrl(gameId: string): Promise<string | null> {
  try {
    const blob = await get(romKey(gameId));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

/** Baixa e guarda a ROM para uso offline (silencioso em caso de falha). */
export async function cacheRom(gameId: string, url: string) {
  try {
    if (await hasCachedRom(gameId)) return;
    const res = await fetch(url);
    if (!res.ok) return;
    await put(romKey(gameId), await res.blob());
  } catch {
    /* sem espaço ou sem rede — segue online */
  }
}

export async function cacheCover(gameId: string, url: string) {
  try {
    if (await get(coverKey(gameId))) return;
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return;
    await put(coverKey(gameId), await res.blob());
  } catch {
    /* ignore */
  }
}

export async function cachedCoverUrl(gameId: string): Promise<string | null> {
  try {
    const blob = await get(coverKey(gameId));
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

export async function clearOfflineCache() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Estado de conexão reativo. */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}
