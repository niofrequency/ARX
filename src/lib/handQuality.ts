import { HandLandmarker, FilesetResolver, type NormalizedLandmark } from '@mediapipe/tasks-vision';

/**
 * ==========================================
 * CLIENT-SIDE HAND QUALITY CHECK
 * ==========================================
 * MediaPipe HandLandmarker — the same free, open-source (Apache 2.0)
 * @mediapipe/tasks-vision package already used elsewhere in this app (see
 * bodySegmentation.ts, interactiveSegment.ts, faceRegions.ts). Runs
 * entirely client-side via WASM, after a generation completes.
 *
 * AI-generated hands are the single most common visual defect in this kind
 * of image generation — extra/fused/missing fingers, melted joints. There
 * is no trained deformity classifier available client-side, so this is
 * deliberately NOT one: just conservative geometric plausibility checks on
 * finger proportions, adapted from an existing internal reference
 * implementation (see the PR/commit this shipped with).
 *
 * EXPLICIT PRODUCT DECISION, matching that reference: purely informational.
 * This never triggers an automatic regenerate and never touches billing —
 * a flagged result only surfaces a small badge; the user decides whether to
 * regenerate. A missed deformity costs nothing (the user's own eyes are
 * still the real check); a false "this looks wrong" nag on a fine hand is
 * the worse failure mode, so the thresholds below lean toward staying
 * silent rather than flagging anything ambiguous.
 */
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export type HandQualityStatus = 'ok' | 'flagged' | 'unknown';

export interface HandQualityResult {
  status: HandQualityStatus;
  reason?: string;
}

let landmarkerPromise: Promise<HandLandmarker> | null = null;

function getHandLandmarker(): Promise<HandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'IMAGE',
        // Up to 4: a scene can legitimately show more than one hand (both
        // of the subject's, or a partner's). Each detected hand's own
        // geometry is evaluated independently, not hand count.
        numHands: 4,
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
    img.onerror = () => reject(new Error('hand quality image load failed'));
    img.src = src;
  });
}

const dist = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(a.x - b.x, a.y - b.y);

/** Wrist(0) + each finger's own chain of joints, per MediaPipe's 21-point hand topology. */
const FINGER_CHAINS: number[][] = [
  [0, 1, 2, 3, 4], // thumb: CMC, MCP, IP, TIP
  [0, 5, 6, 7, 8], // index
  [0, 9, 10, 11, 12], // middle
  [0, 13, 14, 15, 16], // ring
  [0, 17, 18, 19, 20], // pinky
];
const FINGERTIPS = [4, 8, 12, 16, 20];

/**
 * Conservative geometric plausibility check for ONE detected hand. Two
 * checks, both generously tolerant to keep false positives low:
 *  1. Non-thumb fingertips shouldn't sit right on top of each other —
 *     that's a common fused/missing-finger artifact. Thumb excluded since
 *     a thumb naturally sits close to another tip in a pinch-like pose.
 *  2. Each finger's own joint segments should be a plausible fraction of
 *     that finger's total wrist-to-tip length — one sliver-thin segment
 *     next to one wildly oversized one is a common melted-hand artifact.
 * Not a deformity classifier — a hand that fails both checks is
 * confidently worth flagging; a hand that passes both is NOT thereby
 * confirmed perfect, just not confidently bad by this narrow test.
 */
function isHandGeometryPlausible(hand: NormalizedLandmark[]): boolean {
  if (hand.length < 21) return true; // incomplete read — unknown, don't flag

  const palmScale = dist(hand[0], hand[9]) || 0.001; // wrist -> middle-MCP, a stable hand-scale reference
  for (let i = 0; i < FINGERTIPS.length; i++) {
    for (let j = i + 1; j < FINGERTIPS.length; j++) {
      if (FINGERTIPS[i] === 4 || FINGERTIPS[j] === 4) continue; // thumb excluded, see doc comment
      if (dist(hand[FINGERTIPS[i]], hand[FINGERTIPS[j]]) < palmScale * 0.12) return false;
    }
  }

  for (const chain of FINGER_CHAINS) {
    const segLens: number[] = [];
    for (let i = 1; i < chain.length; i++) segLens.push(dist(hand[chain[i - 1]], hand[chain[i]]));
    const total = segLens.reduce((a, b) => a + b, 0) || 0.001;
    for (const len of segLens) {
      const frac = len / total;
      if (frac < 0.08 || frac > 0.7) return false;
    }
  }

  return true;
}

/**
 * Checks a finished generation's hand geometry. Never throws — same
 * fail-open contract as this app's other MediaPipe helpers. Bounded by
 * `timeoutMs`; call this AFTER the image is already shown to the user, so a
 * slow/failed check just means the badge never appears — it never delays
 * or blocks display of the image itself.
 */
export async function checkHandQuality(imageUrl: string, timeoutMs = 4000): Promise<HandQualityResult> {
  try {
    return await Promise.race([
      (async (): Promise<HandQualityResult> => {
        const landmarker = await getHandLandmarker();
        const img = await loadImage(imageUrl);
        const result = landmarker.detect(img);
        const hands = result.landmarks || [];
        if (hands.length === 0) return { status: 'unknown', reason: 'no hand confidently detected' };
        const bad = hands.some((h) => !isHandGeometryPlausible(h));
        return bad ? { status: 'flagged', reason: 'hand geometry looks off' } : { status: 'ok' };
      })(),
      new Promise<HandQualityResult>((resolve) => setTimeout(() => resolve({ status: 'unknown', reason: 'timed out' }), timeoutMs)),
    ]);
  } catch (err) {
    console.warn('Hand quality check failed (skipping):', err);
    return { status: 'unknown', reason: 'detector error' };
  }
}
