export type PoseFamily = 'front' | 'rear' | 'face' | 'tits' | 'other' | 'custom';

const DB_NAME = 'arx-pose-refs';
const STORE = 'refs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'family' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePoseRef(family: PoseFamily, file: File): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put({ family, name: file.name, type: file.type || 'image/jpeg', blob: file });
  });
  db.close();
}

export async function loadPoseRef(family: PoseFamily): Promise<File | null> {
  const db = await openDb();
  const row = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(family);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!row?.blob) return null;
  return new File([row.blob], row.name || `${family}.jpg`, { type: row.type || 'image/jpeg' });
}

export async function listPoseRefFamilies(): Promise<PoseFamily[]> {
  const db = await openDb();
  const keys = await new Promise<PoseFamily[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve((req.result || []) as PoseFamily[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return keys;
}

export async function deletePoseRef(family: PoseFamily): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(family);
  });
  db.close();
}
