import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db, deleteFromFirebase } from './firebase';

// --- Types (kept in sync with the ones in App.tsx) ---
export type HistoryMode = 'editor' | 'upscaler' | 'angles' | 'video';

export interface HistoryItem {
  id: string;
  prompt: string;
  url: string;
  storagePath?: string;
  date: string;
  modelInfo?: string;
  mode?: HistoryMode;
}

export interface SavedPrompt {
  id: string;
  name: string;
  prompt: string;
}

export const HISTORY_PAGE_SIZE = 24;

export interface HistoryFilter {
  mode?: HistoryMode | null;
  sortDir?: 'asc' | 'desc';
}

const historyCollection = (uid: string) => collection(db, 'users', uid, 'history');
const savedPromptsCollection = (uid: string) => collection(db, 'users', uid, 'savedPrompts');

/**
 * Fetches one page of a user's generation history. Pass the last document
 * snapshot from the previous page as `cursor` to get the next page. This
 * keeps the gallery from having to load a user's entire history (which could
 * be hundreds/thousands of images) all at once.
 *
 * Optionally filter to a single generation mode and/or flip sort direction —
 * whenever either of those change, callers should pass cursor=null to
 * restart pagination from the top of the new query.
 */
export const fetchHistoryPage = async (
  uid: string,
  cursor: QueryDocumentSnapshot<DocumentData> | null = null,
  filter: HistoryFilter = {}
): Promise<{ items: HistoryItem[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> => {
  const { mode = null, sortDir = 'desc' } = filter;
  const constraints = [
    ...(mode ? [where('mode', '==', mode)] : []),
    orderBy('date', sortDir),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(HISTORY_PAGE_SIZE),
  ];
  const snap = await getDocs(query(historyCollection(uid), ...constraints));
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<HistoryItem, 'id'>) }));
  return {
    items,
    lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === HISTORY_PAGE_SIZE,
  };
};

/** Saves a completed generation to the signed-in user's Firestore history. */
export const addHistoryDoc = async (uid: string, item: HistoryItem): Promise<void> => {
  await setDoc(doc(historyCollection(uid), item.id), item);
};

/**
 * Deletes a history entry: removes the Firestore record and, if it has an
 * associated file in Firebase Storage, deletes that too so a user's deleted
 * photos don't keep sitting in storage.
 */
export const deleteHistoryDoc = async (uid: string, id: string, storagePath?: string): Promise<void> => {
  await deleteDoc(doc(historyCollection(uid), id));
  if (storagePath) {
    await deleteFromFirebase(storagePath);
  }
};

/**
 * Deletes every history entry (and its storage file) for a user. Used by the
 * "Delete All My Generations" action. Walks pages so it works even for very
 * large histories.
 */
export const deleteAllHistory = async (uid: string): Promise<void> => {
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  while (true) {
    const { items, lastDoc } = await fetchHistoryPage(uid, cursor);
    if (items.length === 0) break;
    await Promise.all(items.map((item) => deleteHistoryDoc(uid, item.id, item.storagePath)));
    if (!lastDoc) break;
    cursor = lastDoc;
  }
};

/** Fetches all of a user's saved prompts. */
export const fetchSavedPrompts = async (uid: string): Promise<SavedPrompt[]> => {
  const snap = await getDocs(query(savedPromptsCollection(uid), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => {
    const data = d.data() as { name: string; prompt: string };
    return { id: d.id, name: data.name, prompt: data.prompt };
  });
};

/** Saves a new named prompt for the signed-in user. Returns the new doc id. */
export const addSavedPromptDoc = async (uid: string, name: string, prompt: string): Promise<string> => {
  const ref = doc(savedPromptsCollection(uid));
  await setDoc(ref, { name, prompt, createdAt: Date.now() });
  return ref.id;
};

/** Deletes one of the signed-in user's saved prompts. */
export const deleteSavedPromptDoc = async (uid: string, id: string): Promise<void> => {
  await deleteDoc(doc(savedPromptsCollection(uid), id));
};

/**
 * Records "this Wavespeed task id belongs to this user" BEFORE the job is
 * submitted, in a top-level (not per-user) pendingJobs collection. This is
 * what lets the server-side webhook — which only ever hears from Wavespeed,
 * with no idea which of your app's users triggered a given task — know
 * whose Firestore/Storage to write the finished result into once the job
 * completes, even if that user's browser is closed or backgrounded.
 *
 * Best-effort / fire-and-forget: if this write fails, the generation still
 * proceeds normally via the existing client-side polling fallback — it just
 * means the webhook path won't have anywhere to deliver a background result.
 */
export const createPendingJob = async (
  uid: string,
  taskId: string,
  mode: string,
  prompt: string,
  modelInfo: string
): Promise<void> => {
  try {
    await setDoc(doc(db, 'pendingJobs', taskId), {
      uid,
      mode,
      prompt,
      modelInfo,
      createdAt: Date.now(),
    });
  } catch (e) {
    console.warn('Failed to record pending job for webhook delivery', e);
  }
};
