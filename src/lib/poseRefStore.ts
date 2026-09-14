import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { auth, db, deleteFromFirebase, getFreshIdToken, uploadToFirebase } from './firebase';
import type { PoseFamily } from './adminPromptBuilder';

/** 'scene' = Image 3 — background, clothing, or an object reference; see adminPromptBuilder.ts's image3Role. */
export type RefSlot = 'face' | 'pose' | 'scene';

export interface LibraryRefMeta {
  id: string;
  name: string;
  slot: RefSlot;
  family: PoseFamily;
  detectedLabel: string;
  createdAt: number;
  type: string;
  url?: string;
  storagePath?: string;
  /**
   * Lowercased `name`, kept alongside it purely so searchLibraryByName()
   * can do a server-side prefix query — Firestore range filters compare
   * bytes, so there's no case-insensitive query without a duplicate,
   * normalized field to query against. Optional because it wasn't tracked
   * before this field existed: an older doc without it simply won't be
   * found by server-side search until it's next saved/renamed (which
   * always (re)writes it) or backfilled — see ensureNameLower.
   */
  nameLower?: string;
}

export interface LibraryRef extends LibraryRefMeta {
  blob?: Blob;
}

function uid(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to save reference photos.');
  return user.uid;
}

const libraryCol = (userId: string) => collection(db, 'users', userId, 'refLibrary');
const familyCol = (userId: string) => collection(db, 'users', userId, 'refFamilies');

async function fileFromStorage(path: string | undefined, name: string, type: string): Promise<File | null> {
  if (!path) return null;
  const token = await getFreshIdToken();
  if (!token) throw new Error('Sign in to use a saved reference.');
  const res = await fetch(`/api/ref-file?path=${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Could not download that reference.');
  }
  const blob = await res.blob();
  return new File([blob], name, { type: type || blob.type || 'image/jpeg' });
}

export async function savePoseRef(family: PoseFamily, file: File): Promise<void> {
  const userId = uid();
  const id = family;
  const storagePath = `users/${userId}/refFamilies/${id}`;
  const url = await uploadToFirebase(file, storagePath);
  await setDoc(doc(familyCol(userId), id), {
    family,
    name: file.name,
    type: file.type || 'image/jpeg',
    url,
    storagePath,
    createdAt: Date.now(),
  });
}

export async function loadPoseRef(family: PoseFamily): Promise<File | null> {
  const userId = uid();
  const snap = await getDoc(doc(familyCol(userId), family));
  if (!snap.exists()) return null;
  const row = snap.data() as { storagePath?: string; name?: string; type?: string };
  return fileFromStorage(row.storagePath, row.name || `${family}.jpg`, row.type || 'image/jpeg');
}

export async function listPoseRefFamilies(): Promise<PoseFamily[]> {
  const userId = uid();
  const snap = await getDocs(familyCol(userId));
  return snap.docs.map((d) => d.id as PoseFamily);
}

export async function deletePoseRef(family: PoseFamily): Promise<void> {
  const userId = uid();
  const refDoc = doc(familyCol(userId), family);
  const snap = await getDoc(refDoc);
  const path = snap.data()?.storagePath as string | undefined;
  if (path) await deleteFromFirebase(path);
  await deleteDoc(refDoc);
}

export async function saveLibraryRef(item: Omit<LibraryRef, 'id' | 'createdAt'> & { id?: string; slot?: RefSlot }): Promise<LibraryRefMeta> {
  const userId = uid();
  const id = item.id || crypto.randomUUID();
  const ext = (item.type || 'image/jpeg').includes('png') ? 'png' : 'jpg';
  const storagePath = `users/${userId}/refLibrary/${id}.${ext}`;
  const blob = item.blob;
  if (!blob) throw new Error('Missing image file.');
  const url = await uploadToFirebase(blob, storagePath);
  const meta: LibraryRefMeta = {
    id,
    name: item.name,
    nameLower: item.name.toLowerCase(),
    slot: item.slot || 'pose',
    family: item.family,
    detectedLabel: item.detectedLabel,
    createdAt: Date.now(),
    type: item.type || 'image/jpeg',
    url,
    storagePath,
  };
  await setDoc(doc(libraryCol(userId), id), meta);
  return meta;
}

// One page of a user's reference library, newest first — a library with
// hundreds of saved faces/poses used to be fetched and rendered all at
// once (listLibraryRefs/listLibraryCards, since removed), which got
// slower and heavier the larger it grew. Paginated the same way
// userData.ts's fetchHistoryPage already paginates the main gallery:
// orderBy + startAfter(cursor) + limit, single-field order so no extra
// composite Firestore index is needed. Faces and poses share one cursor
// stream over the same collection (split client-side by `slot`) rather
// than two independently-filtered queries, specifically to avoid a
// `where(slot==) + orderBy(createdAt)` compound query, which WOULD need a
// composite index provisioned in the Firebase console before it could run.
export const LIBRARY_PAGE_SIZE = 40;

export interface LibraryPage {
  items: (LibraryRefMeta & { previewUrl: string })[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function fetchLibraryPage(cursor: QueryDocumentSnapshot<DocumentData> | null = null): Promise<LibraryPage> {
  const userId = uid();
  const constraints = [
    orderBy('createdAt', 'desc'),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(LIBRARY_PAGE_SIZE),
  ];
  const snap = await getDocs(query(libraryCol(userId), ...constraints));
  const items = snap.docs.map((d) => {
    const meta = { id: d.id, ...(d.data() as Omit<LibraryRefMeta, 'id'>) };
    return { ...meta, previewUrl: meta.url || '' };
  });
  return {
    items,
    lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    hasMore: snap.docs.length === LIBRARY_PAGE_SIZE,
  };
}

export async function loadLibraryRef(id: string): Promise<File | null> {
  const userId = uid();
  const snap = await getDoc(doc(libraryCol(userId), id));
  if (!snap.exists()) return null;
  const row = { id: snap.id, ...(snap.data() as Omit<LibraryRefMeta, 'id'>) };
  return fileFromStorage(row.storagePath, row.name || `${row.detectedLabel}.jpg`, row.type || 'image/jpeg');
}

/**
 * Turns an already-loaded library card straight into a File by fetching its
 * known download URL directly — the same URL the card's thumbnail already
 * used, so this is typically a single (often browser-cached) request. Skips
 * the extra Firestore read and the authenticated /api/ref-file relay that
 * loadLibraryRef() needs when all it has is an id. Falls back to that
 * slower, fully-authenticated path only if the card has no direct URL (an
 * older record) or the direct fetch fails.
 */
export async function loadLibraryFile(item: LibraryRefMeta): Promise<File | null> {
  if (item.url) {
    try {
      const res = await fetch(item.url);
      if (res.ok) {
        const blob = await res.blob();
        return new File([blob], item.name || `${item.detectedLabel || 'ref'}.jpg`, { type: item.type || blob.type || 'image/jpeg' });
      }
    } catch {
      // Direct fetch failed (CORS, expired token, offline …) — fall back below.
    }
  }
  return loadLibraryRef(item.id);
}

export async function deleteLibraryRef(id: string): Promise<void> {
  const userId = uid();
  const refDoc = doc(libraryCol(userId), id);
  const snap = await getDoc(refDoc);
  const path = snap.data()?.storagePath as string | undefined;
  if (path) await deleteFromFirebase(path);
  await deleteDoc(refDoc);
}

export async function renameLibraryRef(id: string, name: string): Promise<void> {
  const userId = uid();
  const refDoc = doc(libraryCol(userId), id);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) throw new Error('Pose not found');
  const nextName = name.trim() || snap.data()?.name;
  await setDoc(refDoc, { ...snap.data(), name: nextName, nameLower: (nextName as string).toLowerCase() }, { merge: true });
}

// Server-side name search — a prefix (starts-with) match on nameLower,
// case-insensitive since it's compared against the lowercased field
// rather than `name` itself. Firestore has no native substring/full-text
// search without a paid third-party index (Algolia, Typesense, ...), so
// this is the free option: a single-field range filter + matching orderBy
// needs no composite index (unlike combining it with a `slot` equality
// filter would — see fetchLibraryPage's comment), so faces and poses are
// split client-side from one combined query result, same as pagination.
// Deliberately separate from (and additive to) the plain substring filter
// AdminRandomPrompt.tsx already runs over whatever's loaded locally: this
// reaches further back into a library that hasn't been fully paginated in
// yet, at the cost of being prefix-only instead of substring-anywhere.
export async function searchLibraryByName(prefix: string, pageSize = LIBRARY_PAGE_SIZE): Promise<(LibraryRefMeta & { previewUrl: string })[]> {
  const q = prefix.trim().toLowerCase();
  if (!q) return [];
  const userId = uid();
  const snap = await getDocs(
    query(libraryCol(userId), orderBy('nameLower'), where('nameLower', '>=', q), where('nameLower', '<=', q + ''), limit(pageSize)),
  );
  return snap.docs.map((d) => {
    const meta = { id: d.id, ...(d.data() as Omit<LibraryRefMeta, 'id'>) };
    return { ...meta, previewUrl: meta.url || '' };
  });
}

/**
 * Backfills `nameLower` on a legacy doc that predates that field, so it
 * becomes findable by searchLibraryByName() from here on. Fire-and-forget
 * by design (callers don't await this) — a self-healing side effect of
 * viewing an old item, not a blocking migration step; failure is silent
 * and harmless; the doc just stays search-blind until it's renamed instead.
 */
export function ensureNameLower(item: LibraryRefMeta): void {
  if (item.nameLower || !item.name) return;
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  updateDoc(doc(libraryCol(userId), item.id), { nameLower: item.name.toLowerCase() }).catch(() => {
    // Best-effort — see doc comment above.
  });
}
