// Responses never leave this browser. IndexedDB, not a server upload.
export type Keepsake =
  | { kind: "letter"; text: string }
  | { kind: "voice"; audio: Blob }
  | { kind: "private" };
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("lost-archive-keepsakes", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("keepsakes");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function saveKeepsake(value: Keepsake) {
  const database = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("keepsakes", "readwrite");
      tx.objectStore("keepsakes").put(value, "ours");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    database.close();
  }
}
export async function readKeepsake(): Promise<Keepsake | undefined> {
  const database = await db();
  try {
    return await new Promise((resolve, reject) => {
      const tx = database.transaction("keepsakes", "readonly");
      const r = tx.objectStore("keepsakes").get("ours");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    database.close();
  }
}
export async function deleteKeepsake() {
  const database = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction("keepsakes", "readwrite");
      tx.objectStore("keepsakes").delete("ours");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    database.close();
  }
}
