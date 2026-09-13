import type { PoseFamily } from './adminPromptBuilder';

const DB_NAME = 'arx-pose-refs';
const DB_VERSION = 2;
const FAMILY_STORE = 'refs';
const LIBRARY_STORE = 'library';

export interface LibraryRefMeta {
  id: string;
  name: string;
  family: PoseFamily;
  detectedLabel: string;
  createdAt: number;
  type: string;
}

export interface LibraryRef extends LibraryRefMeta {
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FAMILY_STORE)) db.createObjectStore(FAMILY_STORE, { keyPath: 'family' });
      if (!db.objectStoreNames.contains(LIBRARY_STORE)) db.createObjectStore(LIBRARY_STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePoseRef(family: PoseFamily, file: File): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FAMILY_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(FAMILY_STORE).put({ family, name: file.name, type: file.type || 'image/jpeg', blob: file });
  });
  db.close();
}

export async function loadPoseRef(family: PoseFamily): Promise<File | null> {
  const db = await openDb();
  const row = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(FAMILY_STORE, 'readonly');
    const req = tx.objectStore(FAMILY_STORE).get(family);
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
    const tx = db.transaction(FAMILY_STORE, 'readonly');
    const req = tx.objectStore(FAMILY_STORE).getAllKeys();
    req.onsuccess = () => resolve((req.result || []) as PoseFamily[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return keys;
}

export async function deletePoseRef(family: PoseFamily): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(FAMILY_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(FAMILY_STORE).delete(family);
  });
  db.close();
}

export async function saveLibraryRef(item: Omit<LibraryRef, 'id' | 'createdAt'> & { id?: string }): Promise<LibraryRefMeta> {
  const row: LibraryRef = {
    id: item.id || crypto.randomUUID(),
    name: item.name,
    family: item.family,
    detectedLabel: item.detectedLabel,
    createdAt: Date.now(),
    type: item.type || 'image/jpeg',
    blob: item.blob,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(LIBRARY_STORE).put(row);
  });
  db.close();
  const { blob, ...meta } = row;
  return meta;
}

export async function listLibraryRefs(): Promise<LibraryRefMeta[]> {
  const db = await openDb();
  const rows = await new Promise<LibraryRef[]>((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE, 'readonly');
    const req = tx.objectStore(LIBRARY_STORE).getAll();
    req.onsuccess = () => resolve((req.result || []) as LibraryRef[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows.map(({ blob, ...meta }) => meta).sort((a, b) => b.createdAt - a.createdAt);
}

export async function loadLibraryRef(id: string): Promise<File | null> {
  const db = await openDb();
  const row = await new Promise<LibraryRef | undefined>((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE, 'readonly');
    const req = tx.objectStore(LIBRARY_STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  db.close();
  if (!row?.blob) return null;
  return new File([row.blob], row.name || `${row.detectedLabel}.jpg`, { type: row.type || 'image/jpeg' });
}

export async function deleteLibraryRef(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LIBRARY_STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(LIBRARY_STORE).delete(id);
  });
  db.close();
}
