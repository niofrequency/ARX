import { FilesetResolver, InteractiveSegmenter } from '@mediapipe/tasks-vision';

let segmenter: InteractiveSegmenter | null = null;
let loading: Promise<InteractiveSegmenter> | null = null;

async function getSegmenter(): Promise<InteractiveSegmenter> {
  if (segmenter) return segmenter;
  if (!loading) {
    loading = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm',
      );
      segmenter = await InteractiveSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float16/1/magic_touch.tflite',
        },
        outputConfidenceMasks: true,
        outputCategoryMask: true,
      });
      return segmenter;
    })();
  }
  return loading;
}

export interface SegmentHit {
  mask: ImageData;
  width: number;
  height: number;
}

function loadCors(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('cors image load'));
    img.src = src;
  });
}

export async function segmentAt(
  image: HTMLImageElement,
  nx: number,
  ny: number,
): Promise<SegmentHit | null> {
  const model = await getSegmenter();
  let input: HTMLImageElement = image;
  try {
    if (image.currentSrc || image.src) input = await loadCors(image.currentSrc || image.src);
  } catch {
    input = image;
  }
  const result = model.segment(input, { keypoint: { x: nx, y: ny } });
  const src = result.confidenceMasks?.[0] || result.categoryMask;
  if (!src) return null;
  const data = src.getAsUint8Array();
  const out = new ImageData(src.width, src.height);
  for (let i = 0; i < data.length; i++) {
    const on = data[i] > 24;
    out.data[i * 4] = 34;
    out.data[i * 4 + 1] = 197;
    out.data[i * 4 + 2] = 94;
    out.data[i * 4 + 3] = on ? 120 : 0;
  }
  try {
    src.close();
  } catch {
    /* older wasm */
  }
  return { mask: out, width: src.width, height: src.height };
}

export function paintHit(canvas: HTMLCanvasElement, hit: SegmentHit, w: number, h: number) {
  const off = document.createElement('canvas');
  off.width = hit.width;
  off.height = hit.height;
  off.getContext('2d')?.putImageData(hit.mask, 0, 0);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, hit.width, hit.height, 0, 0, w, h);
}
