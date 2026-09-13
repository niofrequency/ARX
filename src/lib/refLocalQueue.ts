import localforage from 'localforage';

const drafts = localforage.createInstance({ name: 'arx', storeName: 'refDrafts' });
const hashes = localforage.createInstance({ name: 'arx', storeName: 'refHashes' });

export interface DraftRef {
  id: string;
  name: string;
  slot: 'face' | 'pose';
  type: string;
  createdAt: number;
  blob: Blob;
  aHash: string;
}

export async function queueDraft(draft: DraftRef): Promise<void> {
  await drafts.setItem(draft.id, draft);
  await hashes.setItem(draft.aHash, draft.id);
}

export async function listDrafts(): Promise<DraftRef[]> {
  const out: DraftRef[] = [];
  await drafts.iterate((value) => {
    out.push(value as DraftRef);
  });
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export async function removeDraft(id: string): Promise<void> {
  const draft = await drafts.getItem<DraftRef>(id);
  if (draft?.aHash) await hashes.removeItem(draft.aHash);
  await drafts.removeItem(id);
}

export async function rememberHash(aHash: string, id: string): Promise<void> {
  await hashes.setItem(aHash, id);
}

export async function findHashOwner(aHash: string): Promise<string | null> {
  return (await hashes.getItem<string>(aHash)) || null;
}
