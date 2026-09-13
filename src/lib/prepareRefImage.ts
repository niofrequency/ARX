import imageCompression from 'browser-image-compression';
import ExifReader from 'exifreader';
import Fuse from 'fuse.js';
import Pica from 'pica';
import { findHashOwner, queueDraft, rememberHash } from './refLocalQueue';

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;
const pica = new Pica();

export interface PreparedRef {
  file: File;
  width: number;
  height: number;
  beforeBytes: number;
  afterBytes: number;
  aHash: string;
  exifNote: string;
  duplicateOf?: string | null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function hamming(a: string, b: string): number {
  let n = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) n++;
  return n + Math.abs(a.length - b.length);
}

async function averageHash(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bmp.close();
    return '0'.repeat(64);
  }
  ctx.drawImage(bmp, 0, 0, 8, 8);
  bmp.close();
  const data = ctx.getImageData(0, 0, 8, 8).data;
  const gray: number[] = [];
  for (let i = 0; i < data.length; i += 4) gray.push((data[i] + data[i + 1] + data[i + 2]) / 3);
  const avg = gray.reduce((s, v) => s + v, 0) / gray.length;
  return gray.map((v) => (v >= avg ? '1' : '0')).join('');
}

export async function readExifNote(file: File): Promise<string> {
  try {
    const tags = await ExifReader.load(await file.arrayBuffer(), { expanded: false });
    const bits = [
      tags.Make?.description,
      tags.Model?.description,
      tags.DateTimeOriginal?.description || tags.DateTime?.description,
      tags.ImageWidth?.description && tags.ImageHeight?.description
        ? `${tags.ImageWidth.description}x${tags.ImageHeight.description}`
        : '',
    ].filter(Boolean);
    return bits.length ? bits.join(' · ') : 'No camera EXIF';
  } catch {
    return 'No camera EXIF';
  }
}

async function downscaleWithPica(file: File): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const width = Math.max(1, Math.round(bmp.width * scale));
  const height = Math.max(1, Math.round(bmp.height * scale));
  const from = document.createElement('canvas');
  from.width = bmp.width;
  from.height = bmp.height;
  const fromCtx = from.getContext('2d');
  if (!fromCtx) {
    bmp.close();
    throw new Error('Canvas unavailable');
  }
  fromCtx.drawImage(bmp, 0, 0);
  bmp.close();
  const to = document.createElement('canvas');
  to.width = width;
  to.height = height;
  await pica.resize(from, to);
  return { canvas: to, width, height };
}

export async function prepareRefImage(input: File): Promise<PreparedRef> {
  if (!input.type.startsWith('image/')) throw new Error('Not an image');
  const beforeBytes = input.size;
  const exifNote = await readExifNote(input);
  const aHash = await averageHash(input);
  const duplicateOf = await findHashOwner(aHash);

  const { canvas, width, height } = await downscaleWithPica(input);
  const resized: Blob = await pica.toBlob(canvas, 'image/jpeg', JPEG_QUALITY);
  const resizedFile = new File([resized], input.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });

  let file = resizedFile;
  try {
    file = await imageCompression(resizedFile, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: MAX_EDGE,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: JPEG_QUALITY,
    });
  } catch {
    file = resizedFile;
  }

  return {
    file,
    width,
    height,
    beforeBytes,
    afterBytes: file.size,
    aHash,
    exifNote,
    duplicateOf,
  };
}

export async function ingestRefImage(input: File, slot: 'face' | 'pose'): Promise<PreparedRef> {
  const prepared = await prepareRefImage(input);
  if (prepared.duplicateOf) return prepared;
  await queueDraft({
    id: crypto.randomUUID(),
    name: input.name,
    slot,
    type: prepared.file.type,
    createdAt: Date.now(),
    blob: prepared.file,
    aHash: prepared.aHash,
  });
  await rememberHash(prepared.aHash, 'queued');
  return prepared;
}

export function filterLibrary<T extends { name?: string; detectedLabel?: string; family?: string; slot?: string }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim();
  if (!q) return items;
  const fuse = new Fuse(items, {
    threshold: 0.34,
    ignoreLocation: true,
    keys: ['name', 'detectedLabel', 'family', 'slot'],
  });
  return fuse.search(q).map((hit) => hit.item);
}

export function hashesLookSame(a: string, b: string): boolean {
  return hamming(a, b) <= 6;
}
