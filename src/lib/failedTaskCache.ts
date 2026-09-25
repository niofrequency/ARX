// Local-only cache for failed generations, so the "Retry" button keeps
// working even after a page reload — without ever touching Firebase. A
// failed job's source image(s) and settings are transient/local by nature;
// there's no reason to sync them to the cloud.
//
// Backed by idb-keyval (Apache-2.0, ~600 bytes) instead of hand-rolled
// indexedDB.open()/transaction() calls — same underlying storage, far less
// boilerplate for a plain key -> snapshot cache like this one.

import { createStore, del, set, values } from 'idb-keyval';

// A new database name, not the original hand-rolled store's — that one was
// created with an in-line `keyPath: 'id'`, which idb-keyval's out-of-line
// set(key, value) calls are incompatible with (IndexedDB fixes a store's
// key strategy at creation and won't renegotiate it without a version-
// bumped upgrade). Reusing the name would need a migration for what is, by
// design, a short-lived (see MAX_AGE_MS below), locally-cached, best-effort
// "retry" convenience — not permanent data, so anything already sitting in
// the old store at the time of this change is simply left behind rather
// than migrated.
const store = createStore('ARX_FAILED_TASKS_KV', 'failedTasks');

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
  // Primus (reference-to-video)'s open-ended extra reference images.
  extraRefBlobs?: { blob: Blob; name: string }[];
  createdAt: number;
}

/** Saves (or overwrites) a failed task's full snapshot locally. */
export const saveFailedTaskSnapshot = async (snapshot: FailedTaskSnapshot): Promise<void> => {
  try {
    await set(snapshot.id, snapshot, store);
  } catch (e) {
    console.warn('Failed to save failed-task snapshot locally', e);
  }
};

/** Deletes a snapshot — called once a task is retried successfully, or dismissed. */
export const deleteFailedTaskSnapshot = async (id: string): Promise<void> => {
  try {
    await del(id, store);
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
    const all = await values<FailedTaskSnapshot>(store);

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
