import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite';

export type SegmentSlot = 'background' | 'hair' | 'body' | 'face' | 'clothes' | 'other';

export interface BodySegmentMask {
  width: number;
  height: number;
  classMap: Uint8Array;
  classes: Record<SegmentSlot, number>;
}

let segmenterPromise: Promise<ImageSegmenter> | null = null;

function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    })().catch((err) => {
      segmenterPromise = null;
      throw err;
    });
  }
  return segmenterPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('segment image load failed'));
    img.src = src;
  });
}

export async function getBodySegmentMask(src: string): Promise<BodySegmentMask | null> {
  try {
    const segmenter = await getSegmenter();
    const img = await loadImage(src);
    const result = segmenter.segment(img);
    const mask = result.categoryMask;
    if (!mask) return null;
    try {
      const classMap = mask.getAsUint8Array();
      return {
        width: mask.width,
        height: mask.height,
        classMap,
        classes: { background: 0, hair: 1, body: 2, face: 3, clothes: 4, other: 5 },
      };
    } finally {
      mask.close();
    }
  } catch (err) {
    console.warn('Body segmentation failed', err);
    return null;
  }
}

export function slotAt(mask: BodySegmentMask, nx: number, ny: number): SegmentSlot {
  const x = Math.min(mask.width - 1, Math.max(0, Math.floor(nx * mask.width)));
  const y = Math.min(mask.height - 1, Math.max(0, Math.floor(ny * mask.height)));
  const id = mask.classMap[y * mask.width + x];
  const c = mask.classes;
  if (id === c.hair) return 'hair';
  if (id === c.body) return 'body';
  if (id === c.face) return 'face';
  if (id === c.clothes) return 'clothes';
  if (id === c.other) return 'other';
  return 'background';
}

/**
 * Where the natural image content actually lands inside an <img>'s box,
 * given its rendered `object-fit`. `x/y/width/height` is the sub-rect of
 * the element's own box that shows image pixels (the rest is letterboxing
 * for `contain`); `cropX/Y/Width/Height` is the natural-image region drawn
 * there (a crop, for `cover`). Assumes default centered `object-position`.
 */
export interface ImageFitRect {
  x: number;
  y: number;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

export function getImageFitRect(img: HTMLImageElement): ImageFitRect {
  const rect = img.getBoundingClientRect();
  const boxW = rect.width || img.clientWidth || 1;
  const boxH = rect.height || img.clientHeight || 1;
  const natW = img.naturalWidth || boxW;
  const natH = img.naturalHeight || boxH;

  let fit = 'fill';
  try {
    fit = getComputedStyle(img).objectFit || 'fill';
  } catch {
    // getComputedStyle unavailable (e.g. detached node) — fall back to 'fill'
  }

  if (fit === 'cover') {
    // Image is scaled to fully cover the box, then cropped; content fills
    // the whole box, so the crop is the part of it that's actually shown.
    const scale = Math.max(boxW / natW, boxH / natH);
    const cropWidth = boxW / scale;
    const cropHeight = boxH / scale;
    return {
      x: 0,
      y: 0,
      width: boxW,
      height: boxH,
      cropX: (natW - cropWidth) / 2,
      cropY: (natH - cropHeight) / 2,
      cropWidth,
      cropHeight,
    };
  }

  if (fit === 'contain' || fit === 'scale-down') {
    // Image is scaled to fit entirely inside the box, centered; the rest of
    // the box is letterboxing with no image content.
    const scale = Math.min(boxW / natW, boxH / natH);
    const width = natW * scale;
    const height = natH * scale;
    return {
      x: (boxW - width) / 2,
      y: (boxH - height) / 2,
      width,
      height,
      cropX: 0,
      cropY: 0,
      cropWidth: natW,
      cropHeight: natH,
    };
  }

  // 'fill' (the default with no object-fit set) — image is stretched to
  // exactly match the box, so the naive linear mapping is already correct.
  return { x: 0, y: 0, width: boxW, height: boxH, cropX: 0, cropY: 0, cropWidth: natW, cropHeight: natH };
}

/**
 * Maps a pointer's client coordinates to normalized (0-1) image coordinates,
 * accounting for the element's `object-fit` — cropping (`cover`) or
 * letterboxing (`contain`) that a plain box-relative division ignores.
 * Returns null when the pointer is outside the box, or inside it but over
 * letterboxing rather than actual image content.
 */
export function imagePointFromClient(
  img: HTMLImageElement,
  clientX: number,
  clientY: number,
): { nx: number; ny: number } | null {
  const rect = img.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  if (px < 0 || py < 0 || px > rect.width || py > rect.height) return null;

  const fit = getImageFitRect(img);
  if (!fit.width || !fit.height) return null;
  if (px < fit.x || py < fit.y || px > fit.x + fit.width || py > fit.y + fit.height) return null;

  const natW = img.naturalWidth || fit.cropWidth;
  const natH = img.naturalHeight || fit.cropHeight;
  if (!natW || !natH) return null;

  const ix = fit.cropX + ((px - fit.x) / fit.width) * fit.cropWidth;
  const iy = fit.cropY + ((py - fit.y) / fit.height) * fit.cropHeight;
  return { nx: Math.min(1, Math.max(0, ix / natW)), ny: Math.min(1, Math.max(0, iy / natH)) };
}

export function paintSlot(canvas: HTMLCanvasElement, mask: BodySegmentMask, slot: SegmentSlot, img: HTMLImageElement) {
  const id = mask.classes[slot];
  const off = document.createElement('canvas');
  off.width = mask.width;
  off.height = mask.height;
  const octx = off.getContext('2d');
  if (!octx) return;
  const imgData = octx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.classMap.length; i++) {
    if (mask.classMap[i] !== id) continue;
    const o = i * 4;
    imgData.data[o] = 34;
    imgData.data[o + 1] = 197;
    imgData.data[o + 2] = 94;
    imgData.data[o + 3] = 110;
  }
  octx.putImageData(imgData, 0, 0);

  const rect = img.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;

  // Draw only the natural-image region actually visible under this
  // element's object-fit (cropped for `cover`, letterboxed for `contain`)
  // so the overlay lines up with what the user sees, not the raw mask.
  const fit = getImageFitRect(img);
  ctx.drawImage(off, fit.cropX, fit.cropY, fit.cropWidth, fit.cropHeight, fit.x, fit.y, fit.width, fit.height);
}
