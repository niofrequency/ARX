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

/** face = Image 1, pose = Image 2, scene = Image 3 background, clothes = Image 3 outfit. */
export type RefSlot = 'face' | 'pose' | 'scene' | 'clothes';

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
  const storagePath = `users/${userId}/refFamilies/${family}`;
  const url = await uploadToFirebase(file, storagePath);
  await setDoc(doc(familyCol(userId), family), {
    family, name: file.name, type: file.type || 'image/jpeg', url, storagePath, createdAt: Date.now(),
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
  if (!item.blob) throw new Error('Missing image file.');
  const url = await uploadToFirebase(item.blob, storagePath);
  const meta: LibraryRefMeta = {
    id, name: item.name, nameLower: item.name.toLowerCase(), slot: item.slot || 'pose',
    family: item.family, detectedLabel: item.detectedLabel, createdAt: Date.now(),
    type: item.type || 'image/jpeg', url, storagePath,
  };
  await setDoc(doc(libraryCol(userId), id), meta);
  return meta;
}

export const LIBRARY_PAGE_SIZE = 40;

export interface LibraryPage {
  items: (LibraryRefMeta & { previewUrl: string })[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function fetchLibraryPage(cursor: QueryDocumentSnapshot<DocumentData> | null = null): Promise<LibraryPage> {
  const userId = uid();
  const constraints = [orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(LIBRARY_PAGE_SIZE)];
  const snap = await getDocs(query(libraryCol(userId), ...constraints));
  const items = snap.docs.map((d) => {
    const meta = { id: d.id, ...(d.data() as Omit<LibraryRefMeta, 'id'>) };
    return { ...meta, previewUrl: meta.url || '' };
  });
  return { items, lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null, hasMore: snap.docs.length === LIBRARY_PAGE_SIZE };
}

export async function loadLibraryRef(id: string): Promise<File | null> {
  const userId = uid();
  const snap = await getDoc(doc(libraryCol(userId), id));
  if (!snap.exists()) return null;
  const row = { id: snap.id, ...(snap.data() as Omit<LibraryRefMeta, 'id'>) };
  return fileFromStorage(row.storagePath, row.name || `${row.detectedLabel}.jpg`, row.type || 'image/jpeg');
}

export async function loadLibraryFile(item: LibraryRefMeta): Promise<File | null> {
  if (item.url) {
    try {
      const res = await fetch(item.url);
      if (res.ok) {
        const blob = await res.blob();
        return new File([blob], item.name || `${item.detectedLabel || 'ref'}.jpg`, { type: item.type || blob.type || 'image/jpeg' });
      }
    } catch {}
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

export async function searchLibraryByName(prefix: string, pageSize = LIBRARY_PAGE_SIZE): Promise<(LibraryRefMeta & { previewUrl: string })[]> {
  const q = prefix.trim().toLowerCase();
  if (!q) return [];
  const userId = uid();
  const snap = await getDocs(
    query(libraryCol(userId), orderBy('nameLower'), where('nameLower', '>=', q), where('nameLower', '<=', q + '\uf8ff'), limit(pageSize)),
  );
  return snap.docs.map((d) => {
    const meta = { id: d.id, ...(d.data() as Omit<LibraryRefMeta, 'id'>) };
    return { ...meta, previewUrl: meta.url || '' };
  });
}

export function ensureNameLower(item: LibraryRefMeta): void {
  if (item.nameLower || !item.name) return;
  const userId = auth.currentUser?.uid;
  if (!userId) return;
  updateDoc(doc(libraryCol(userId), item.id), { nameLower: item.name.toLowerCase() }).catch(() => {});
}
