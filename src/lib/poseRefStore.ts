import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { auth, db, deleteFromFirebase, getFreshIdToken, uploadToFirebase } from './firebase';
import type { PoseFamily } from './adminPromptBuilder';

export type RefSlot = 'face' | 'pose';

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

export async function listLibraryRefs(): Promise<LibraryRefMeta[]> {
  const userId = uid();
  const snap = await getDocs(libraryCol(userId));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<LibraryRefMeta, 'id'>) }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function listLibraryCards(): Promise<(LibraryRefMeta & { previewUrl: string })[]> {
  const rows = await listLibraryRefs();
  return rows.map((meta) => ({ ...meta, previewUrl: meta.url || '' }));
}

export async function loadLibraryRef(id: string): Promise<File | null> {
  const userId = uid();
  const snap = await getDoc(doc(libraryCol(userId), id));
  if (!snap.exists()) return null;
  const row = { id: snap.id, ...(snap.data() as Omit<LibraryRefMeta, 'id'>) };
  return fileFromStorage(row.storagePath, row.name || `${row.detectedLabel}.jpg`, row.type || 'image/jpeg');
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
  await setDoc(refDoc, { ...snap.data(), name: name.trim() || snap.data()?.name }, { merge: true });
}
