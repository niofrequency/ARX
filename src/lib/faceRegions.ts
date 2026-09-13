import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * ==========================================
 * NAMED FACIAL FEATURE REGIONS (eyes, eyebrows, lips)
 * ==========================================
 * MediaPipe FaceLandmarker — the same free, open-source (Apache 2.0)
 * @mediapipe/tasks-vision package already used elsewhere in this app (see
 * bodySegmentation.ts, interactiveSegment.ts), just a different model.
 * Runs entirely client-side via WASM.
 *
 * bodySegmentation.ts's 6-class segmenter only knows "face" as a single
 * blob, and interactiveSegment.ts's point segmenter has no names for
 * anything at all — it just segments whatever's under the cursor. Neither
 * can tell you "this is specifically her left eye." FaceLandmarker's
 * 478-point face mesh can: it exposes the boundary of each named feature as
 * a `Connection[]` (an edge list forming a closed loop), via static
 * properties on the class itself (FACE_LANDMARKS_LEFT_EYE, etc.) — so the
 * region polygons below are built from MediaPipe's own official topology,
 * not hand-guessed landmark indices.
 *
 * Note there is no official FACE_LANDMARKS_NOSE constant — MediaPipe's own
 * face mesh topology doesn't name a nose region, only the ones below plus
 * FACE_OVAL/CONTOURS/TESSELATION. A hover over the nose (or anything else
 * not covered here) simply finds no named region and falls back to
 * whatever the interactive point segmenter / coarse body segmenter resolve
 * it to instead — same fail-open layering as the rest of this file.
 */
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export type FaceRegionName = 'leftEye' | 'rightEye' | 'leftEyebrow' | 'rightEyebrow' | 'lips';

export const FACE_REGION_LABELS: Record<FaceRegionName, string> = {
  leftEye: 'left eye',
  rightEye: 'right eye',
  leftEyebrow: 'left eyebrow',
  rightEyebrow: 'right eyebrow',
  lips: 'lips',
};

export interface FaceRegionSet {
  /** One polygon (closed, ordered ring of normalized 0-1 points) per named region, per detected face. */
  faces: Partial<Record<FaceRegionName, { x: number; y: number }[]>>[];
}

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'IMAGE',
        numFaces: 4,
      });
    })().catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('face landmark image load failed'));
    img.src = src;
  });
}

/**
 * Walks a region's edge list into an ordered, closed polygon. MediaPipe
 * ships these as unordered {start,end} pairs that happen to form one
 * simple cycle (each landmark index appears in exactly two pairs) —
 * useful for drawing individual line segments, but not directly usable as
 * a fill path or a point-in-polygon test without first tracing the loop
 * into vertex order.
 */
function connectionsToPolygon(connections: { start: number; end: number }[], landmarks: NormalizedLandmark[]): { x: number; y: number }[] {
  if (connections.length === 0) return [];
  // Each vertex in a simple closed loop has exactly two neighbors — build
  // that adjacency, then walk it, at each step stepping to whichever
  // neighbor isn't where we just came from, until back at the start.
  const adj = new Map<number, number[]>();
  const addEdge = (a: number, b: number) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  };
  for (const { start, end } of connections) {
    addEdge(start, end);
    addEdge(end, start);
  }
  const startIdx = connections[0].start;
  const order: number[] = [startIdx];
  let prev = -1;
  let cur = startIdx;
  for (let i = 0; i < connections.length; i++) {
    const nextIdx = (adj.get(cur) || []).find((n) => n !== prev);
    if (nextIdx === undefined || nextIdx === startIdx) break;
    order.push(nextIdx);
    prev = cur;
    cur = nextIdx;
  }
  return order.map((i) => ({ x: landmarks[i]?.x ?? 0, y: landmarks[i]?.y ?? 0 }));
}

const REGION_CONNECTIONS: () => Record<FaceRegionName, { start: number; end: number }[]> = () => ({
  leftEye: FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
  rightEye: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
  leftEyebrow: FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
  rightEyebrow: FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
  lips: FaceLandmarker.FACE_LANDMARKS_LIPS,
});

/**
 * Detects named facial feature regions in a photo. Never throws — same
 * fail-open contract as bodySegmentation.ts/interactiveSegment.ts: null (or
 * an empty face list) just means "no named regions available here",  and
 * callers fall back to the coarser segmenters instead of blocking anything.
 */
export async function getFaceRegions(src: string): Promise<FaceRegionSet | null> {
  try {
    const landmarker = await getLandmarker();
    const img = await loadImage(src);
    const result = landmarker.detect(img);
    const connections = REGION_CONNECTIONS();
    const faces = (result.faceLandmarks || []).map((landmarks) => {
      const regions: Partial<Record<FaceRegionName, { x: number; y: number }[]>> = {};
      (Object.keys(connections) as FaceRegionName[]).forEach((name) => {
        const poly = connectionsToPolygon(connections[name], landmarks);
        if (poly.length >= 3) regions[name] = poly;
      });
      return regions;
    });
    return { faces };
  } catch (err) {
    console.warn('Face region detection failed', err);
    return null;
  }
}

/** Standard ray-casting point-in-polygon test, on normalized 0-1 coordinates. */
function pointInPolygon(poly: { x: number; y: number }[], px: number, py: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Resolves a normalized (0-1) point to a named region, if it falls inside one — across every detected face. */
export function faceRegionAt(regions: FaceRegionSet, nx: number, ny: number): { name: FaceRegionName; polygon: { x: number; y: number }[] } | null {
  for (const face of regions.faces) {
    for (const name of Object.keys(face) as FaceRegionName[]) {
      const poly = face[name];
      if (poly && pointInPolygon(poly, nx, ny)) return { name, polygon: poly };
    }
  }
  return null;
}

/** Paints a region's polygon onto `canvas`, aligned to how `img` is actually rendered (same object-fit awareness as paintSlot/paintHit). */
export function paintFaceRegion(canvas: HTMLCanvasElement, polygon: { x: number; y: number }[], img: HTMLImageElement) {
  const rect = img.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx || polygon.length < 3) return;
  ctx.clearRect(0, 0, w, h);

  // Reuse the same object-fit-aware rect getBodySegmentation's paintSlot
  // relies on, via a tiny local re-implementation to avoid a circular
  // import — the two modules paint onto the same kind of <img>, cropped or
  // letterboxed the same way.
  const natW = img.naturalWidth || w;
  const natH = img.naturalHeight || h;
  let fit = 'fill';
  try { fit = getComputedStyle(img).objectFit || 'fill'; } catch { /* detached node — fall back to 'fill' */ }
  let ox = 0, oy = 0, rw = w, rh = h;
  if (fit === 'contain' || fit === 'scale-down') {
    const scale = Math.min(w / natW, h / natH);
    rw = natW * scale; rh = natH * scale;
    ox = (w - rw) / 2; oy = (h - rh) / 2;
  }
  // 'cover' needs no offset here: the polygon's own normalized coordinates
  // already fall within the visible crop for any point that could have
  // been hit-tested in the first place (faceRegionAt only ever runs
  // against points imagePointFromClient already resolved as visible).

  ctx.beginPath();
  polygon.forEach((p, i) => {
    const x = ox + p.x * rw;
    const y = oy + p.y * rh;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(34, 197, 94, 0.43)';
  ctx.fill();
}
