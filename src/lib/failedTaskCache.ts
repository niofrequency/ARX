// Local-only cache for failed generations, so the "Retry" button keeps
// working even after a page reload — without ever touching Firebase. A
// failed job's source image(s) and settings are transient/local by nature;
// there's no reason to sync them to the cloud.

const DB_NAME = 'ARX_FAILED_TASKS';
const STORE_NAME = 'failedTasks';
const DB_VERSION = 1;

// How long a failed-task snapshot (and its stored image blobs) is kept
// around before being pruned automatically, so this cache doesn't grow
// forever if someone never retries or dismisses an old failure.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface FailedTaskSnapshot {
  id: string;
  mode: string;
  prompt: string;
  modelInfo: string;
  errorMessage: string;
  editorModel: string;
  videoEngine: string;
  horizontalAngle: number;
  verticalAngle: number;
  distance: number;
  targetResolution: string;
  activeLorasJson: string;
  primaryBlob: Blob;
  primaryName: string;
  ref2Blob?: Blob;
  ref2Name?: string;
  ref3Blob?: Blob;
  ref3Name?: string;
  createdAt: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

/** Saves (or overwrites) a failed task's full snapshot locally. */
export const saveFailedTaskSnapshot = async (snapshot: FailedTaskSnapshot): Promise<void> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(snapshot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to save failed-task snapshot locally', e);
  }
};

/** Deletes a snapshot — called once a task is retried successfully, or dismissed. */
export const deleteFailedTaskSnapshot = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Failed to delete failed-task snapshot', e);
  }
};

/**
 * Loads every stored snapshot (pruning anything older than MAX_AGE_MS along
 * the way), so failed generations from a previous session can still be
 * retried after a reload.
 */
export const loadFailedTaskSnapshots = async (): Promise<FailedTaskSnapshot[]> => {
  try {
    const db = await openDB();
    const all: FailedTaskSnapshot[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as FailedTaskSnapshot[]);
      request.onerror = () => reject(request.error);
    });

    const now = Date.now();
    const fresh = all.filter((s) => now - s.createdAt < MAX_AGE_MS);
    const stale = all.filter((s) => now - s.createdAt >= MAX_AGE_MS);
    if (stale.length > 0) {
      await Promise.all(stale.map((s) => deleteFailedTaskSnapshot(s.id)));
    }
    return fresh.sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.warn('Failed to load failed-task snapshots', e);
    return [];
  }
};
