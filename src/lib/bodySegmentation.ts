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

export function paintSlot(canvas: HTMLCanvasElement, mask: BodySegmentMask, slot: SegmentSlot, w: number, h: number) {
  const id = mask.classes[slot];
  const off = document.createElement('canvas');
  off.width = mask.width;
  off.height = mask.height;
  const octx = off.getContext('2d');
  if (!octx) return;
  const img = octx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.classMap.length; i++) {
    if (mask.classMap[i] !== id) continue;
    const o = i * 4;
    img.data[o] = 34;
    img.data[o + 1] = 197;
    img.data[o + 2] = 94;
    img.data[o + 3] = 110;
  }
  octx.putImageData(img, 0, 0);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, mask.width, mask.height, 0, 0, w, h);
}
