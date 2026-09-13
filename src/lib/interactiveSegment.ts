import { FilesetResolver, InteractiveSegmenter } from '@mediapipe/tasks-vision';
import { getImageFitRect } from './bodySegmentation';

let segmenter: InteractiveSegmenter | null = null;
let loading: Promise<InteractiveSegmenter> | null = null;

async function getSegmenter(): Promise<InteractiveSegmenter> {
  if (segmenter) return segmenter;
  if (!loading) {
    loading = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
      );
      const model = await InteractiveSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float16/1/magic_touch.tflite',
        },
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      segmenter = model;
      return model;
    })().catch((err) => {
      loading = null;
      throw err;
    });
  }
  return loading;
}

export interface SegmentHit {
  mask: Float32Array;
  width: number;
  height: number;
}

/**
 * Class-agnostic "point anywhere" segmentation: returns a precise mask of
 * whatever is under the given normalized point (nx, ny) in the *source*
 * image — an eye, the nose, a single clothing item, a strand of hair, a
 * held prop, or any other object. Unlike the fixed background/hair/body/
 * face/clothes/other body segmenter, this has no predefined categories, so
 * it works for arbitrarily specific or unusual regions.
 */
export async function segmentAt(image: HTMLImageElement, nx: number, ny: number): Promise<SegmentHit | null> {
  try {
    const model = await getSegmenter();
    const result = model.segment(image, { keypoint: { x: nx, y: ny } });
    const confidence = result.confidenceMasks?.[0];
    if (!confidence) return null;
    try {
      return {
        mask: confidence.getAsFloat32Array(),
        width: confidence.width,
        height: confidence.height,
      };
    } finally {
      confidence.close();
    }
  } catch (err) {
    console.warn('Interactive point segmentation failed', err);
    return null;
  }
}

/**
 * Paints a hit from segmentAt onto `canvas`, aligned to how `img` is
 * actually rendered (cropped for object-fit: cover, letterboxed for
 * object-fit: contain) so the highlight lines up with what's on screen.
 */
export function paintHit(canvas: HTMLCanvasElement, hit: SegmentHit, img: HTMLImageElement) {
  const off = document.createElement('canvas');
  off.width = hit.width;
  off.height = hit.height;
  const octx = off.getContext('2d');
  if (!octx) return;
  const imgData = octx.createImageData(hit.width, hit.height);
  for (let i = 0; i < hit.mask.length; i++) {
    const on = hit.mask[i] > 0.5;
    const o = i * 4;
    imgData.data[o] = 34;
    imgData.data[o + 1] = 197;
    imgData.data[o + 2] = 94;
    imgData.data[o + 3] = on ? 150 : 0;
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

  const fit = getImageFitRect(img);
  ctx.drawImage(off, fit.cropX, fit.cropY, fit.cropWidth, fit.cropHeight, fit.x, fit.y, fit.width, fit.height);
}

/**
 * Runs `fn` without ever overlapping calls: while one is in flight, newer
 * requests replace the queued one instead of piling up, and the moment it
 * finishes the latest queued request runs next. Keeps a pointer-driven
 * model call responsive without flooding the segmenter on every event.
 */
export function createCoalescedRunner<T>(fn: (arg: T) => Promise<void>) {
  let busy = false;
  let queued: T | null = null;
  return (arg: T) => {
    queued = arg;
    if (busy) return;
    busy = true;
    (async () => {
      while (queued !== null) {
        const cur = queued;
        queued = null;
        await fn(cur);
      }
      busy = false;
    })();
  };
}
