const DB_NAME = "fliperama-states";
const STORE = "states";
export const SAVE_SLOTS = [1, 2, 3, 4] as const;

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

function key(gameId: string, slot: number) {
  return `${gameId}:${slot}`;
}

export type SlotInfo = { slot: number; savedAt: string };

export async function putState(gameId: string, slot: number, state: Uint8Array) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ state, savedAt: new Date().toISOString() }, key(gameId, slot));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getState(gameId: string, slot: number): Promise<Uint8Array | null> {
  const db = await openDb();
  const value = await new Promise<{ state: Uint8Array } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key(gameId, slot));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value?.state ?? null;
}

export async function listSlots(gameId: string): Promise<SlotInfo[]> {
  const db = await openDb();
  const infos = await Promise.all(
    SAVE_SLOTS.map(
      (slot) =>
        new Promise<SlotInfo | null>((resolve) => {
          const tx = db.transaction(STORE, "readonly");
          const req = tx.objectStore(STORE).get(key(gameId, slot));
          req.onsuccess = () =>
            resolve(req.result ? { slot, savedAt: req.result.savedAt as string } : null);
          req.onerror = () => resolve(null);
        }),
    ),
  );
  db.close();
  return infos.filter((i): i is SlotInfo => i !== null);
}

export async function clearSlot(gameId: string, slot: number) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key(gameId, slot));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export type Cheat = { desc: string; code: string; enabled: boolean };

export function loadCheats(gameId: string): Cheat[] {
  try {
    const raw = window.localStorage.getItem(`fliperama-cheats:${gameId}`);
    return raw ? (JSON.parse(raw) as Cheat[]) : [];
  } catch {
    return [];
  }
}

export function saveCheats(gameId: string, cheats: Cheat[]) {
  window.localStorage.setItem(`fliperama-cheats:${gameId}`, JSON.stringify(cheats));
}
