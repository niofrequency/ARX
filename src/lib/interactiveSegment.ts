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

export async function segmentAt(
  image: HTMLImageElement,
  nx: number,
  ny: number,
): Promise<SegmentHit | null> {
  const model = await getSegmenter();
  const result = model.segment(image, {
    keypoint: { x: nx, y: ny },
  });
  const confidence = result.confidenceMasks?.[0];
  const category = result.categoryMask;
  const src = confidence || category;
  if (!src) return null;
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const out = ctx.createImageData(src.width, src.height);
  const data = src.getAsUint8Array();
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    const on = v > 20;
    out.data[i * 4] = 0;
    out.data[i * 4 + 1] = 242;
    out.data[i * 4 + 2] = 255;
    out.data[i * 4 + 3] = on ? 140 : 0;
  }
  return { mask: out, width: src.width, height: src.height };
}

export function maskToPng(hit: SegmentHit): string {
  const canvas = document.createElement('canvas');
  canvas.width = hit.width;
  canvas.height = hit.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(hit.mask, 0, 0);
  return canvas.toDataURL('image/png');
}

export function paintMask(canvas: HTMLCanvasElement, hit: SegmentHit) {
  canvas.width = hit.width;
  canvas.height = hit.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(hit.mask, 0, 0);
}
