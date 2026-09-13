/** Browser-only image prep. No extra packages. Canvas redraw strips EXIF/GPS. */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

export interface PreparedRef {
  file: File;
  width: number;
  height: number;
  beforeBytes: number;
  afterBytes: number;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export async function prepareRefImage(input: File): Promise<PreparedRef> {
  if (!input.type.startsWith('image/')) throw new Error('Not an image');
  const beforeBytes = input.size;
  const bitmap = await createImageBitmap(input);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return { file: input, width: bitmap.width, height: bitmap.height, beforeBytes, afterBytes: beforeBytes };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compress failed'))), 'image/jpeg', JPEG_QUALITY);
  });
  const name = input.name.replace(/\.[^.]+$/, '') + '.jpg';
  const file = new File([blob], name, { type: 'image/jpeg' });
  if (file.size >= beforeBytes && scale === 1) {
    return { file: input, width, height, beforeBytes, afterBytes: beforeBytes };
  }
  return { file, width, height, beforeBytes, afterBytes: file.size };
}

export function filterLibrary<T extends { name?: string; detectedLabel?: string; family?: string; slot?: string }>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const hay = [item.name, item.detectedLabel, item.family, item.slot].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });
}
